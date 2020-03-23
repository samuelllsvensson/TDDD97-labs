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

import hashlib
from hashlib import sha256
from flask_bcrypt import Bcrypt

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
bcrypt = Bcrypt(app)
app.debug = True
yagmail.register(EMAIL,PWD) #Replace with real credentials

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
    hashed_password = bcrypt.generate_password_hash(pwd).decode('utf-8')
    if (validation(email, pwd, firstName, familyName, gender, city, country)):
        print('inserted user to database with hashed_password: ', hashed_password)
        result = database_helper.insert_user(email, hashed_password, firstName, familyName,
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
    hashed_password = database_helper.get_hashed_password(email)
    #print('hashed password from helper: ', hashed_password)
    correct_password = bcrypt.check_password_hash(hashed_password, pwd)
    if not (database_helper.find_user_pwd(email, hashed_password)):
        res = jsonify({'success': False, 'message': 'Wrong email or password'})
        return res
    token = database_helper.login_user(email)
    if (token and correct_password):
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
    hashed_token = request.headers.get('token')
    data = request.get_json()

    email = data['email']
    payload = data['payload']
    token = database_helper.get_token_from_email(email)
    server_hash = sha256((token[0]+payload).encode('utf-8')).hexdigest()
    
    userData = database_helper.get_user_data_by_token(token[0])
    #print('GETUSERDATABYTOKEN: server_hash is:', server_hash, ' and hashed_token is: ', hashed_token)
    if userData != None and server_hash == hashed_token:
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
    payload = data['payload']
    user_exists = database_helper.find_user(email)
    if(user_exists):
        token = database_helper.get_token_from_email(email)
        #print('GETUSERDATABYTOKEN: token', token[0])
        hashed_token = request.headers.get('token')
        server_hash = sha256((token[0]+payload).encode('utf-8')).hexdigest()
        #print('GETUSERDATABYEMAIL: server_hash is:', server_hash, ' and hashed_token is: ', hashed_token)
        result = database_helper.get_user_data_by_email(token[0], email)
        if result != None and token[0] and server_hash == hashed_token:
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
                'message': 'There is no such user in database2!'
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
            print("successfully posted message: ", message, 'to receiver: ', receiver)
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

    data = request.get_json()
    hashed_token = request.headers.get('token')
    email = data['email']
    payload = data['payload']
    token = database_helper.get_token_from_email(email)
    server_hash = sha256((token[0]+payload).encode('utf-8')).hexdigest()
    #print('GETUSERMSGSBYTOKEN: server_hash is:', server_hash, ' and hashed_token is: ', hashed_token)

    result = database_helper.get_user_messages_by_token(token[0])
    if token[0] is not None:
        if result is not None and server_hash == hashed_token:
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
    hashed_token = request.headers.get('token')
    email = data['email']
    payload = data['payload']
    token = database_helper.get_token_from_email(email)
    server_hash = sha256((token[0]+payload).encode('utf-8')).hexdigest()
    result = database_helper.get_user_messages_by_email(token[0], email)

    if token[0] is not None:
        if result is not None and server_hash == hashed_token:
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
    hashed_token = request.headers.get('token')
    
    data = request.get_json()
    email = data['email']
    token = database_helper.get_token_from_email(email)

    server_hash = sha256((token[0]+email).encode('utf-8')).hexdigest()
    #print('SIGNOUT: server_hash is:', server_hash, ' and hashed_token is: ', hashed_token)
    print('signing out token: ', token[0])
    user = database_helper.get_email_from_token(token[0])
    result = database_helper.logout_user(token[0])
    if (result == True) and server_hash == hashed_token:
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
    #return ''

def make_key():
    return uuid.uuid4()

@app.route('/change_password', methods=['POST'])
def change_password():
    """Change password
        Changes password of currently logged in user given old and new password
    """
    data = request.get_json()
    hashed_token = request.headers.get('token')
    oldPwd = data['oldPwd']
    newPwd = data['newPwd']
    email = data['email']
    token = database_helper.get_token_from_email(email)

    hashed_old_password = bcrypt.generate_password_hash(oldPwd).decode('utf-8')
    hashed_password = database_helper.get_hashed_password(email)
    #print('hashed_password for this email is: ', hashed_password)
    correct_password = bcrypt.check_password_hash(hashed_password, oldPwd)
    hashed_new_password = bcrypt.generate_password_hash(newPwd).decode('utf-8')
    #print('hashed_new_password: ', hashed_new_password)
    #print('correct_password: ', correct_password)

    server_hash = sha256((token[0]+oldPwd+newPwd+email).encode('utf-8')).hexdigest()
    #print('CHANGEPWD: server_hash is:', server_hash, ' and hashed_token is: ', hashed_token)

    if (len(newPwd) < 5):
        res = jsonify({'success': False, 'message': 'Too short password'})
        return res
    if (oldPwd != newPwd) and correct_password and server_hash == hashed_token:
        result = database_helper.change_password(token[0], str(hashed_password), str(hashed_new_password))
        
        print('result in changepassword', result)
        if (result == True):
            res = jsonify({'success': True, 'message': 'Password changed'})
            print('changed user password from: ',str(hashed_password), ' to: ',  str(hashed_new_password) )
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


@app.route('/reset_password', methods=['POST'])
def reset_password():
    data = request.get_json()
    resetEmail = data['email']
    oldPwd = data['oldPwd']
    key = make_key()
    token = database_helper.get_token_from_email(resetEmail)

    hashed_old_password = bcrypt.generate_password_hash(oldPwd).decode('utf-8')
    hashed_password = database_helper.get_hashed_password(resetEmail)
    #print('hashed_password for this email is: ', hashed_password)
    correct_password = bcrypt.check_password_hash(hashed_password, oldPwd)
    hashed_new_password = bcrypt.generate_password_hash(str(key)).decode('utf-8')
    #print('correct_password: ', correct_password)

    server_hash = sha256((token[0]+oldPwd+resetEmail).encode('utf-8')).hexdigest()
    #print('RESETPASSWORD: server_hash is:', server_hash, ' and hashed_token is: ', hashed_token)

    email = database_helper.find_user(resetEmail)
    if (email) and correct_password and server_hash == hashed_token:
        try:
            #print('success! hashed_new_password: ', str(hashed_new_password) )
            result = database_helper.reset_password(resetEmail, str(hashed_password), str(hashed_new_password))
            #print('reset user password from: ',str(hashed_password), ' to: ',  str(hashed_new_password) )
            print('result is: ', result)
            if (result):        
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

@app.route('/websocket')
def websocket():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        token = ws.receive()
        email = database_helper.validate_logged_in(token)
        #print('got email from validate_logged_in in websocket server.py', email)
        email = email[0]
        #print(database_helper.validate_user(token))
        if database_helper.validate_user(token):
            if email in sockets:
                # oldSocket is the existing entry
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

def push_websocket_active_users():
    total_users = database_helper.get_total_users()
    print('----------push_websocket_active_users------------')
    message = {
        'dataMsg': 'users',
        'online_users' : len(sockets),
        'total_users' : total_users
    }
    print('Online users: ', message['online_users'])
    print('Total users: ', message['total_users'])
    for users in sockets.keys():
        #print('users', users)
        sockets[users].send(json.dumps(message))

def push_websocket_total_posts():
    total_posts = database_helper.get_total_messages()
    print('----------push_websocket_total_posts------------')
    print(sockets)
    for email in sockets.keys():
        my_posts = database_helper.get_total_user_messages(email)
        message = {
        'dataMsg': 'posts',
        'my_posts' :  my_posts[0],
        'total_posts' : total_posts[0]
        }
        print('total_posts: ' , total_posts[0])
        print('My posts: ', message['my_posts'])
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
