from flask import app, Flask, request, jsonify
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler
from gevent import pywsgi
from geventwebsocket import WebSocketError

import yagmail
import keyring
import logging
import uuid
import json
import database_helper
import re
logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
app.debug = True
yagmail.register(EMAIL,PASSWPORD) #Replace with real credentials

sockets = {}

@app.teardown_request
def after_request(exception):
    database_helper.disconnect_db()


@app.route('/')
def root():
    return app.send_static_file('client.html')


@app.route('/sign_up', methods=['POST'])
def sign_up():
    """Sign up
        Gets user data from JSON form and calls validation function
    If data is OK, insert user into users table
    """
    data = request.get_json()
    logging.info(data)
    email = data['email']
    pwd = data['pwd']
    firstName = data['firstName']
    familyName = data['familyName']
    gender = data['gender']
    city = data['city']
    country = data['country']

    if (validation(email, pwd, firstName, familyName, gender, city, country)):
        result = database_helper.insert_user(email, pwd, firstName, familyName,
                                             gender, city, country)
    else:
        res = jsonify({'success': False, 'message': 'Validation failed!'})
        return res
    if result == True:
        res = jsonify({'success': True, 'message': 'Sign up successful!'})
        return res
    else:
        res = jsonify({'success': False, 'message': 'Something went wrong!'})
        return res


@app.route('/sign_in', methods=['POST', 'GET'])
def sign_in():
    """Sign in
        Gets email and password from JSON form and searches for user in database
    If user exists, log in user
    """
    data = request.get_json()
    email = data['email']
    pwd = data['pwd']
    if not (database_helper.find_user_pwd(email, pwd)):
        res = jsonify({'success': False, 'message': 'Wrong email or password'})
        return res
    token = database_helper.login_user(email)
    if (token):
        res = jsonify({
            'success': True,
            'message': 'Signed in!',
            'token': token
        })
        push_websocket_active_users()
        push_websocket_total_posts()
        return res
    else:
        res = jsonify({'success': False, 'message': 'Something went wrong!'})
        return res


@app.route('/get_user_data_by_token', methods=['POST'])
def get_user_data_by_token():
    """Get user data by token
        Given a token, returns corresponding user data
    """
    token = request.headers.get('token')
    userData = database_helper.get_user_data_by_token(token)
    if userData != None:
        res = jsonify({
            'success': True,
            'email': userData[0],
            'firstName': userData[1],
            'familyName': userData[2],
            'gender': userData[3],
            'city': userData[4],
            'country': userData[5]
        })
    else:
        res = jsonify({'success': False, 'message': 'Something went wrong!'})
    return res


@app.route('/get_user_data_by_email', methods=['POST'])
def get_user_data_by_email():
    """Get user data by email
        Given an email, returns corresponding user data

        Keyword arguments:
    email -- input email (string), default = None
    """
    data = request.get_json()
    email = data['email']
    token = request.headers.get('token')
    result = database_helper.get_user_data_by_email(token, email)
    if result != None:
        res = jsonify({
            'success': True,
            'email': result[0],
            'firstName': result[1],
            'familyName': result[2],
            'gender': result[3],
            'city': result[4],
            'country': result[5]
        })
    else:
        res = jsonify({
            'success': False,
            'message': 'There is no such user in database!'
        })

    return res


@app.route('/post_message', methods=['POST'])
def post_message():
    """Post message
        Posts a message to given other users wall or own wall
    """
    data = request.get_json()
    token = request.headers.get('token')
    receiver = data['receiver']
    message = data['postedMessage']
    if message == None:
        res = jsonify({'success': False, 'message': 'No message'})
        return res

    result = database_helper.post_message(token, receiver, message)
    if token is not None:
        if result == True:
            push_websocket_total_posts()
            res = jsonify({
                'success': True,
                'message': 'Message posted',
                'receiver': receiver
            })
            print("successfully posted message: ", message)
        else:
            res = jsonify({
                'success': False,
                'message': 'Posting message failed!'
            })
            print("result is false in post message")

    else:
        res = jsonify({'success': False, 'message': 'Invalid token!'})

    return res


@app.route('/get_user_messages_by_token', methods=['POST'])
def get_user_messages_by_token():
    token = request.headers.get('token')
    result = database_helper.get_user_messages_by_token(token)
    if token is not None:
        if result is not None:
            res = {
                'success': True,
                'message': "Successfully retrieved all messages",
                'data': result
            }
        else:
            res = {'success': False, 'message': "Could not retrieve messages"}
    else:
        res = {
            'success': False,
            'message': "Invalid token, could not retrieve data"
        }

    return json.dumps(res)


@app.route('/get_user_messages_by_email', methods=['POST'])
def get_user_messages_by_email():
    data = request.get_json()
    token = request.headers.get('token')
    email = data['email']
    result = database_helper.get_user_messages_by_email(token, email)
    if token is not None:
        if result is not None:
            res = {
                'success': True,
                'message': "Successfully retrieved all messages",
                'data': result
            }
        else:
            res = {'success': False, 'message': "Could not retrieve messages"}
    else:
        res = {
            'success': False,
            'message': "Invalid token, could not retrieve data"
        }

    return json.dumps(res)


@app.route('/sign_out', methods=['POST'])
def sign_out():
    """Sign out
        Signs out currently logged in user
    """
    token = request.headers.get('token')
    print('signing out token: ', token)
    user = database_helper.get_email_from_token(token)
    result = database_helper.logout_user(token)
    if (result == True):
        print('sockets before sign out ', sockets)
        print('user[0] before sign out ', user[0])
        print('sockets[user[0]] before sign out ', sockets[user[0]])
        print('deleting: ', sockets[user[0]])
        del sockets[user[0]]
        push_websocket_active_users()

        res = jsonify({'success': True, 'message': 'Signed out!'})
        return res
    else:
        res = jsonify({'success': False, 'message': 'Something went wrong!'})
        return res


@app.route('/change_password', methods=['POST'])
def change_password():
    """Change password
        Changes password of currently logged in user given old and new password
    """
    data = request.get_json()
    token = request.headers.get('token')
    oldPwd = data['oldPwd']
    newPwd = data['newPwd']

    if (len(newPwd) < 5):
        res = jsonify({'success': False, 'message': 'Too short password'})
        return res
    if (oldPwd != newPwd):
        result = database_helper.change_password(token, oldPwd, newPwd)
        print('result in changepassword', result)
        if (result == True):
            res = jsonify({'success': True, 'message': 'Password changed'})
            return res
        else:
            res = jsonify({
                'success': False,
                'message': 'Something went wrong!'
            })
            return res
    else:
        res = jsonify({
            'success': False,
            'message': 'Old and new password are the same'
        })
        return res
    return jsonify({'success': False, 'message': 'end'})



@app.route('/websocket')
def websocket():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        token = ws.receive()
        email = database_helper.validate_logged_in(token)
        print('got email from validate_logged_in in websocket server.py', email)
        email = email[0]
        # print(database_helper.validate_user(token))
        if database_helper.validate_user(token):
            if email in sockets:
                # oldsocket is the existing entry
                oldSocket = sockets[email]
                try:
                    message = {
                        'data': 'sign_out'
                    }
                    oldSocket.send(json.dumps(message))
                except WebSocketError as e:
                    print('ERROR (server.py websocket): ', e)
                del sockets[email]
            sockets[email] = ws
            push_websocket_active_users()
            push_websocket_total_posts()

            while True:
                try:
                    ws.receive()
                except WebSocketError as e:
                    print('ERROR (server.py websocket)', e)
                    return ''
    return ''


def make_key():
    return uuid.uuid4()


@app.route('/reset_password', methods=['POST'])
def reset_password():
    data = request.get_json()
    resetEmail = data['email']
    oldPwd = data['oldPwd']
    key = make_key()
    #print(str(key))
    #print(resetEmail)
    email = database_helper.find_user(resetEmail)
    if (email):
        #print('email is', email)
        try:
            result = database_helper.reset_password(resetEmail, oldPwd, str(key))
            print('result is: ', result)
            if (result):
                print('result is: ', result, '... Trying to send email')
                print('trying to register connection...')
                
                print('trying to set up SMTP connection...')
                yag = yagmail.SMTP(user=resetEmail)
                print('setting contents...')
                contents = [
                    "You've requested to reset your Twidder password.",
                    'Your new password is: ', str(key)
                ]
                print(contents)
                print('creating recipients')
                recipients = {
                    resetEmail: 'Twidder user'
                }
                print(recipients)
                print('trying to send email...')
                yag.send(to=recipients,
                            subject='Your temporary Twidder password',
                            contents=contents)
                print("Email sent successfully")
                res = jsonify({'message': 'Email sent successfully'})
                return res
        except:
            print("Error, email was not sent")

    return ''

def push_websocket_active_users():
    total_users = database_helper.get_total_users()
    print('----------push_websocket_active_users------------')
    print('total users: ' , total_users)
    message = {
        'dataMsg': 'users',
        'online_users' : len(sockets),
        'total_users' : total_users
    }
    print('broadcasting message: ', message)
    for users in sockets.keys():
        #print('users', users)
        sockets[users].send(json.dumps(message))

def push_websocket_total_posts():
    total_posts = database_helper.get_total_messages()
    print('----------push_websocket_total_posts------------')
    print('total_posts: ' , total_posts[0])
    print(sockets)
    for email in sockets.keys():
        print('email', email)
        my_posts = database_helper.get_total_user_messages(email)
        message = {
        'dataMsg': 'posts',
        'my_posts' :  my_posts[0],
        'total_posts' : total_posts[0]
        }
        print('sending message: ', message, ' to: ',sockets[email])
        sockets[email].send(json.dumps(message))

def validation(email, pwd, firstName, familyName, gender, city, country):
    """Validation function
        Gets user data and validates it

    Keyword arguments:
    email -- input email (string)
    pwd -- input pwd (string)
        firstName -- input first name (string)
        familyName -- input family name (string)
        gender -- input gender (string)
        city -- input city (string)
        country -- input country (string)
    """
    if not (re.match(r"[^@]+@[^@]+\.[^@]+", email)):
        print("Email is not valid")
        return False
    elif (len(pwd) < 5):
        print("Password is too short")
        return False
    elif (len(firstName) == 0):
        print("Please enter a first name")
        return False
    elif (len(familyName) == 0):
        print("Please enter a family name")
        return False
    elif not (gender == 'Male' or gender == 'Female'):
        print("Gender must be 'Male' or 'Female'")
        return False
    elif (len(city) == 0):
        print("Please enter a city")
        return False
    elif (len(country) == 0):
        print("Please enter a country")
        return False
    return True

if __name__ == "__main__":
    print("starting server http://127.0.0.1:8080")
    server = WSGIServer(('127.0.0.1', 8080), app, 
                        handler_class=WebSocketHandler)
    server.serve_forever()
