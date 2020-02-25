import sqlite3
from flask import g
import string
import random

conn = sqlite3.connect('database.db')
c = conn.cursor()
DATABASE = "database.db"

def get_db():
	db = getattr(g, '_database', None)
	if db is None:
		db = g._database = connect_to_database()
	return db

def connect_to_database():
	return sqlite3.connect('database.db')

def disconnect_db():
	db = getattr(g, '_database', None)
	if db is not None:
		db.close()

def generate_token():
	alphabet = string.ascii_letters + string.digits
	return ''.join(random.choice(alphabet) for i in range(36))

def insert_user(email, pwd, firstName, familyName, gender, city, country):
	"""Insert user 
    Takes user data and inserts values into the users table

	Keyword arguments:
    email -- input email (string)
    pwd -- input pwd (string)
	firstName -- input first name (string)
	familyName -- input family name (string)
	gender -- input gender (string)
	city -- input city (string)
	country -- input country (string)
    """
	try:
		get_db().execute("INSERT INTO users VALUES(?,?,?,?,?,?,?)", [email, pwd, firstName, familyName, gender, city, country])
		get_db().commit()
		return True
	except:
		return False



def login_user(email):
	"""Log in user 
	Logs in user by inserting email and corresponding token into logged_in table 

	Keyword arguments:
    email -- input email (string)
    """
	try:
		token = generate_token()
		get_db().execute("INSERT INTO logged_in VALUES(?,?)", [email, token])
		get_db().commit()
		return token
	except Exception as ex:
		print("Exception: ", ex)
		return None

def find_user(email, pwd):
	"""Find user 
	Fetches from users table the searched user 
	
	Keyword arguments:
    email -- input email (string)
	pwd -- input password (string)
    """
	cursor = get_db().execute("SELECT * FROM users WHERE email=? AND pwd=?", [email, pwd])
	rows = cursor.fetchone()
	cursor.close()
	if (rows == None):
		return False
	else:
		return True

def logout_user(token):
	"""Log out user
	Logs out current user and deletes it from logged_in
	
	Keyword arguments:
    token -- user token (string)
    """
	try:
		get_db().execute("DELETE FROM logged_in WHERE token=?", [token])
		print("Logged out user with token: ", token)
		get_db().commit()
		return True
	except:
		return False

def validate_logged_in(token):
	"""Validate logged in
	Validates if user token corresponds to a logged in user in logged_in table
	
	Keyword arguments:
    token -- user token (string)
    """
	try:
		cursor = get_db().execute("SELECT email FROM logged_in WHERE token=?", [token])
		email = cursor.fetchone()
		cursor.close()
		return email
	except:
		return None

def change_password(token, oldPwd, newPwd):
	"""Change password
	Changes password of user and updates it in users table
	
	Keyword arguments:
    token -- user token (string)
	oldPwd -- old user password (string)
	newPwd -- new user password (string)
    """
	try:
		email = validate_logged_in(token)
		print(email)
		if (email[0] == None):
			return False
		cursor = get_db().execute("SELECT pwd FROM users WHERE email=?", [email[0]])
		pwd = cursor.fetchone()
		cursor.close()
		if (pwd[0] == oldPwd and pwd[0] != None):
			get_db().execute("UPDATE users SET pwd=? WHERE email=?", [newPwd, email[0]])
			get_db().commit()
			return True
		else:
			return False
	except:
		return False

def get_user_data_by_token(token):
	"""Get user data by token
	Fetches user data by given token from users table
	
	Keyword arguments:
    token -- user token (string)
    """
	try:
		email = validate_logged_in(token)
		if (email[0] == None):
			return None
		cursor = get_db().execute("SELECT email, firstName, familyName, gender, city, country FROM users WHERE email=?", [email[0]])
		data = cursor.fetchone()
		cursor.close()
		return data
	except:
		return None

def get_user_data_by_email(token, email):
	"""Get user data by email
	Fetches user data by email from users table
	Validates if user is logged in before fetching
	
	Keyword arguments:
	token -- user token (string)
    email -- user email (string)
    """
	try:
		row = validate_logged_in(token)
		if (row == None):
			return None
		cursor = get_db().execute("SELECT email, firstName, familyName, gender, city, country FROM users WHERE email=?", [email])
		data = cursor.fetchone()
		cursor.close()
		return data
	except:
		return None

def post_message(token, to, message):
	"""Post message
	Posts message to user wall of text 
	
	Keyword arguments:
	token -- user token (string)
    email -- user email (string)
    """
	try:
		email = validate_logged_in(token)
		if (email == None):
			return False
		cursor = get_db().execute("SELECT * FROM users WHERE email=?", [to])
		user = cursor.fetchone()
		cursor.close()
		if (user == None):
			return False
		get_db().execute("INSERT INTO wall_of_text (receiver, sender, message) VALUES(?,?,?)", [to, email[0], message])
		get_db().commit()
		return True
	except:
		return False

def get_user_messages_by_token(token):
	"""Get user messages by token
	Gets all messages from given user token
	
	Keyword arguments:
	token -- user token (string)
    """
	try:
		email = validate_logged_in(token)
		if (email == None):
			return jsonify({'success' : False})
		cursor = get_db().execute("SELECT message From wall_of_text WHERE receiver=?", [email[0]])
		messages = cursor.fetchall()
		cursor.close()
		if (len(messages) == 0):
			return None
		return {'success' : True, 'data' : messages}
	except:
		return {'success' : False}

def get_user_messages_by_email(token, email):
	"""Get user messages by email
	Gets all messages from given user email and token
	
	Keyword arguments:
	token -- user token (string)
	email -- user email (string)
    """
	try:
		validation = validate_logged_in(token)
		if (validation == None):
			return {'success' : False}
		cursor = get_db().execute("SELECT message From wall_of_text WHERE receiver=?", [email])
		messages = cursor.fetchall()
		cursor.close()
		if (len(messages) == 0):
			return {'success' : False}
		return {'success' : True, 'data' : messages}
	except:
		return {'success' : False}
