from flask import Flask, request, jsonify
import database_helper
import re

app = Flask(__name__)

app.debug = True

@app.teardown_request
def after_request(exception):
    database_helper.disconnect_db()

@app.route('/sign_up', methods=['POST'])
def sign_up():
    """Sign up
	Gets user data from JSON form and calls validation function
    If data is OK, insert user into users table
    """
    data = request.get_json()
    email = data['email']
    pwd = data['pwd']
    firstName = data['firstName']
    familyName = data['familyName']
    gender = data['gender']
    city = data['city']
    country = data['country']

    if (validation(email, pwd, firstName, familyName, gender, city, country)):
        result = database_helper.insert_user(
            email, pwd, firstName, familyName, gender, city, country)
    else:
        res = jsonify({'success': False, 'message': 'Validation failed!'})
        return res
    if result == True:
        res = jsonify({'success': True, 'message': 'Sign up successful!'})
        return res
    else:
        res = jsonify({'success': False, 'message': 'Something went wrong!'})
        return res

@app.route('/sign_in', methods=['POST'])
def sign_in():
    """Sign in
	Gets email and password from JSON form and searches for user in database
    If user exists, log in user
    """
    data = request.get_json()
    email = data['email']
    pwd = data['pwd']

    if not (database_helper.find_user(email, pwd)):
        res = jsonify({'success': False, 'message': 'Wrong email or password'})
        return res
    token = database_helper.login_user(email)

    if(token):
        res = jsonify(
            {'success': True, 'message': 'Signed in!', 'token': token})
        return res
    else:
        res = jsonify({'success': False, 'message': 'Something went wrong!'})
        return res


@app.route('/sign_out', methods=['POST'])
def sign_out():
    """Sign out
	Signs out currently logged in user
    """
    token = request.headers.get('token')
    print(token)
    result = database_helper.logout_user(token)

    if (result == True):
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
    token = request.headers.get('token')
    data = request.get_json()
    oldPwd = data['oldPwd']
    newPwd = data['newPwd']

    if(len(newPwd) < 5):
        res = jsonify({'success': False, 'message': 'Too short password'})
        return res
    result = database_helper.change_password(token, oldPwd, newPwd)
    print(result)
    if(result == True):
        res = jsonify({'success': True, 'message': 'Password changed!'})
        return res
    res = jsonify({'success': False, 'message': 'Something went wrong!'})
    return res


@app.route('/userdata_token', methods=['GET'])
def get_user_data_by_token():
    """Get user data by token
	Given a token, returns corresponding user data
    """
    token = request.headers.get('token')
    data = database_helper.get_user_data_by_token(token)
    if data != None:
        res = jsonify({'success': True, 'email': data[0], 'firstName': data[1],
                       'familyName': data[2], 'gender': data[3], 'city': data[4], 'country': data[5]})
        return res
    res = jsonify({'success': False, 'message': 'Something went wrong!'})
    return res


@app.route('/userdata_email/<email>', methods=['GET'])
def get_user_data_by_email(email=None):
    """Get user data by email
	Given an email, returns corresponding user data
	
	Keyword arguments:
    email -- input email (string), default = None
    """
    token = request.headers.get('token')
    result = database_helper.get_user_data_by_email(token, email)
    if result != None:
        res = jsonify({'success': True, 'email': result[0], 'firstName': result[1],
                       'familyName': result[2], 'gender': result[3], 'city': result[4], 'country': result[5]})
        return res
    res = jsonify({'success': False, 'message': 'Something went wrong!'})
    return res

@app.route('/post_message', methods=['POST'])
def post_message():
    """Post message
	Posts a message to given other users wall or own wall 
    """
    token = request.headers.get('token')
    data = request.get_json()
    to = data['email']
    message = data['message']

    if message == None:
        res = jsonify({'success': False, 'message': 'No message'})
        return res

    result = database_helper.post_message(token, to, message)
    if result == True:
        res = jsonify({'success': True, 'message': 'Message posted'})
        return res
    res = jsonify({'success': False, 'message': 'Something went wrong!'})
    return res

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

@app.route('/get_user_messages_by_token', methods=['GET'])
def get_user_messages_by_token():
    token = request.headers.get('token')
    result = database_helper.get_user_messages_by_token(token)
    if result['success'] == True:
        return jsonify({'success': True, 'data': result['data']})
    res = jsonify({'success': False, 'message': 'Something went wrong!'})
    return res


@app.route('/get_user_messages_by_email/<email>', methods=['GET'])
def get_user_messages_by_email(email=None):
    token = request.headers.get('token')
    result = database_helper.get_user_messages_by_email(token, email)
    if (result['success'] == True):
        return jsonify({'success': True, 'data': result['data']})
    res = jsonify({'success': False, 'message': 'Something went wrong!'})
    return res

if __name__ == "__main__":
    app.run()
