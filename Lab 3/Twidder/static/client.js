/*
 * client.js is used to validate, change views, passwords and post messages
 * Author: Samuel Svensson 
 */
const log = console.log;

/* ------------------      MAIN       ----------------------- */
displayView = function() {
	// Check if user is already logged in (token already exists client-side)
	if (localStorage.getItem('token') !== null) {
		document.getElementById('view').innerHTML = document.getElementById('profileview').innerHTML;
		document.getElementById('defaultOpen').click();
		document.getElementById('defaultOpen').style.backgroundColor = '#333';

		if (localStorage.getItem('currState') === null) {
			localStorage.setItem('currState', 'Home');
			log('displaying home');
		}
		connectToSocket();
		displayHome();
		openPage('Home');
	} else {
		// First time user
		document.getElementById('view').innerHTML = document.getElementById('welcomeview').innerHTML;
	}
};
window.onload = function() {
	displayView();
};

/* ------------------      TAB FUNCTIONALITY       ----------------------- */
/**
 * Changes current tab view
 * @param  {[string]} pageName Name of active div
 */
function openPage(pageName) {
	var i, tabcontent, tablinks;
	localStorage.setItem('currState', pageName);
	tabcontent = document.getElementsByClassName('tabcontent');
	for (i = 0; i < tabcontent.length; i++) {
		tabcontent[i].style.display = 'none';
	}
	tablinks = document.getElementsByClassName('tablink');
	for (i = 0; i < tablinks.length; i++) {
		tablinks[i].style.backgroundColor = '';
	}
	document.getElementById(pageName).style.display = 'block';
}
/* ------------------      LOGIN       ----------------------- */
/**
 * Validates login form input and store token
 * @param  {[submit]} formData Data object containing form input on event trigger
 * @return {[bool]} true if sign-up was successful
 */
logInValidation = function(signInForm) {
	var message = document.getElementById('signInMessage');
	var mailOk = validateEmail(signInForm.logInEmail.value);
	if (mailOk) {
		var http = new XMLHttpRequest();
		var params = JSON.stringify({
			email: signInForm.logInEmail.value,
			pwd: signInForm.loginPwd.value
		});
		http.onreadystatechange = function(ev) {
			if (http.readyState == 4 && http.status == 200) {
				var returnObject = JSON.parse(http.responseText);
				if (returnObject.success) {
					localStorage.setItem('token', returnObject.token);
					localStorage.setItem('email', signInForm.logInEmail.value);
					document.getElementById('view').innerHTML = document.getElementById('profileview').innerHTML;
					document.getElementById('defaultOpen').click();
					document.getElementById('defaultOpen').style.backgroundColor = '#333';
					displayHome();
					updateMessages();
					return true;
				} else {
					document.getElementById('signInMessage').innerText = returnObject.message;
				}
			}
		};
		XHttpPost(http, '/sign_in', params, localStorage.getItem('token'));
		return false;
	} else {
		log('Inputted email not valid');
		message.innerText = 'Inputted email not valid';
		return false;
	}
};

/* ------------------      SIGNUP         ----------------------- */
/**
 * Validates sign-up form input using checkSignUpPassword and store token
 * @param  {[submit]} formData Data object containing form input on event trigger
 */
signUpValidation = function(signUpForm) {
	var mailOk = validateEmail(signUpForm.signUpEmail.value);
	var message = document.getElementById('signInMessage');
	if (mailOk) {
		if (validateSignUpPassword(signUpForm)) {
			// Store values in object for sending to server
			var dataObject = JSON.stringify({
				firstName: signUpForm.firstName.value,
				familyName: signUpForm.familyName.value,
				gender: signUpForm.gender.value,
				city: signUpForm.city.value,
				country: signUpForm.country.value,
				email: signUpForm.signUpEmail.value,
				pwd: signUpForm.signUpPwd.value
			});
			var http = new XMLHttpRequest();
			http.onreadystatechange = function(ev) {
				if (http.readyState == 4 && http.status == 200) {
					var returnObject = JSON.parse(http.responseText);
					if (returnObject.success) {
						document.getElementById('signUpMessage').innerText = returnObject.message;
					} else {
						document.getElementById('signUpMessage').innerText = returnObject.message;
					}
				}
			};
			XHttpPost(http, '/sign_up', dataObject, localStorage.getItem('token'));
			return false;
		} else {
			log('validateSignUpPassword is false');
			message.innerText = "Inputted password is either too short or doesn't match";
			return false;
		}
	} else {
		log('Inputted email not valid');
		message.innerText = 'Inputted email not valid';
		return false;
	}
};

/* ------------------      HOME / DISPLAY INFO       ----------------------- */
/**
 * Displays current personal info of logged in user 
 */
function displayHome() {
	var http = new XMLHttpRequest();
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			document.getElementById('view').innerHTML = document.getElementById('profileview').innerHTML;
			var returnObject = JSON.parse(http.responseText);
			var userData = returnObject;

			document.getElementById('LName').innerHTML = userData.firstName;
			document.getElementById('LFamilyName').innerHTML = userData.familyName;
			document.getElementById('LGender').innerHTML = userData.gender;
			document.getElementById('LCity').innerHTML = userData.city;
			document.getElementById('LCountry').innerHTML = userData.country;
			document.getElementById('LEmail').innerHTML = userData.email;
			updateMessages();
		}
	};
	var url = '/get_user_data_by_token';
	var params = JSON.stringify({
		token: localStorage.getItem('token'),
		email: localStorage.getItem('email')
	});
	XHttpPost(http, url, params, localStorage.getItem('token'));
}
/* ------------------      HOME / POST MESSAGE       ----------------------- */
/**
 * Changes current tab view
 * @param  {[submit]} messageData Form data containing message to post
 */
function postMessage() {
	var token = localStorage.getItem('token');
	var receiver = localStorage.getItem('email');
	var postedMessage = document.getElementsByName('areaText');
	postedMessage = postedMessage[0].value;
	var http = new XMLHttpRequest();
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			var returnObject = JSON.parse(http.responseText);
			if (returnObject.success) {
				document.getElementById('message').innerText = returnObject.message;
				document.getElementsByName('areaText')[0].value = '';
				updateMessages();
			} else {
				document.getElementById('message').innerText = returnObject.message;
			}
		}
	};
	var params = JSON.stringify({
		token: token,
		receiver: receiver,
		postedMessage: postedMessage
	});
	XHttpPost(http, '/post_message', params, token);
	return false;
}

/* ------------------      HOME / UPDATE MESSAGES     ----------------------- */
/**
 * Updates all messages posted by user (and others)
 */
function updateMessages() {
	var container = document.getElementById('allMessages');
	var http = new XMLHttpRequest();
	var empty = 'No messages yet!';
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			var returnObject = JSON.parse(http.responseText);
			if (returnObject.success) {
				var messageData = returnObject.data;
				var returnList = 'No messages yet.';
				if (messageData.length > 0) {
					messageData.forEach(function(item) {
						returnList += '<div>' + item[0] + ': ' + item[1] + '</div>';
					});
				} else {
					container.innerHTML = empty;
				}
				container.innerHTML = returnList;
			} else {
				container.innerHTML = returnObject.message;
			}
		}
	};
	var url = '/get_user_messages_by_token';
	var params = JSON.stringify({
		token: localStorage.getItem('token')
	});
	XHttpPost(http, url, params, localStorage.getItem('token'));
}

/* ------------------      BROWSE / SEARCH USER       ----------------------- */
/**
 * Displays searched user personal info
 */
function searchUser() {
	var userEmail = document.getElementById('searchedEmail').value;
	var mailOk = validateEmail(userEmail);

	var errorMessage = document.getElementById('emailError');
	if (mailOk) {
		var http = new XMLHttpRequest();
		http.onreadystatechange = function(ev) {
			if (http.readyState == 4 && http.status == 200) {
				var returnObject = JSON.parse(http.responseText);
				if (returnObject.success) {
					localStorage.setItem('search', userEmail);
					if (localStorage.getItem('search') != null) {
						var userData = returnObject;

						document.getElementById('OName').innerHTML = userData.firstName;
						document.getElementById('OFamilyName').innerHTML = userData.familyName;
						document.getElementById('OGender').innerHTML = userData.gender;
						document.getElementById('OCity').innerHTML = userData.city;
						document.getElementById('OCountry').innerHTML = userData.country;
						document.getElementById('OEmail').innerHTML = userData.email;
						updateBrowseMessages();
					} else {
						document.getElementById('searchMessage').innerHTML = returnObject.message;
					}
				} else {
					document.getElementById('searchMessage').innerHTML = returnObject.message;
				}
			}
		};
		var url = '/get_user_data_by_email';
		var params = JSON.stringify({
			email: userEmail
		});
		XHttpPost(http, url, params, localStorage.getItem('token'));
		return false;
	} else {
		errorMessage.innerText = 'Inputted email is not valid';
		log('Inputted email is not valid');
	}
	return false;
}

/* ------------------      BROWSE / UPDATE BROWSE MESSAGES       ----------------------- */
/**
 * Updates browse message list whilst in Browse tab to see own posts and others. 
 */
function updateBrowseMessages() {
	var container = document.getElementById('allBrowseMessages');
	var userEmail = document.getElementById('searchedEmail').value;
	var http = new XMLHttpRequest();
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			var returnObject = JSON.parse(http.responseText);
			if (returnObject.success) {
				var messageData = returnObject.data;
				var empty = 'No messages yet!';
				if (messageData.length > 0) {
					var returnList = '';
					messageData.forEach((item) => {
						returnList += '<div>' + item[0] + ': ' + item[1] + '</div>';
					});
				} else {
					container.innerHTML = empty;
				}
				container.innerHTML = returnList;
			} else {
				container.innerHTML = returnObject.message;
			}
		}
	};
	var url = '/get_user_messages_by_email';
	var params = JSON.stringify({
		token: localStorage.getItem('token'),
		email: userEmail
	});
	XHttpPost(http, url, params, localStorage.getItem('token'));
}

/* ------------------      BROWSE / POST BROWSE MESSAGES       ----------------------- */
/**
 */
function postBrowseMessage() {
	var token = localStorage.getItem('token');
	var receiver = localStorage.getItem('search');
	var postedBrowseMessage = document.getElementsByName('areaBrowseText');
	postedBrowseMessage = postedBrowseMessage[0].value;

	var http = new XMLHttpRequest();
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			var returnObject = JSON.parse(http.responseText);
			if (returnObject.success) {
				document.getElementById('message').innerText = returnObject.message;
				updateBrowseMessages(returnObject.receiver);
			} else {
				document.getElementById('message').innerText = returnObject.message;
			}
		}
	};

	var params = JSON.stringify({
		token: token,
		receiver: receiver,
		postedMessage: postedBrowseMessage
	});
	XHttpPost(http, '/post_message', params, token);
	document.getElementsByName('areaBrowseText')[0].value = '';
	return false;
}

/* ------------------      ACCOUNT / SIGN OUT       ----------------------- */
/**
 * Signs out the current user and delete token
 */
function signOut() {
	var http = new XMLHttpRequest();
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			var returnObject = JSON.parse(http.responseText);
			if (returnObject.success) {
				localStorage.removeItem('token');
				localStorage.removeItem('currState');
				localStorage.removeItem('search');
				localStorage.removeItem('email');
				displayView();
			} else {
				document.getElementById('message').innerText = returnObject.message;
			}
		}
	};
	var params = JSON.stringify({
		token: localStorage.getItem('token'),
		email: localStorage.getItem('email')
	});
	XHttpPost(http, '/sign_out', params, localStorage.getItem('token'));
	return false;
}

/* ------------------      ACCOUNT / CHANGE PWD      ----------------------- */
/**
 * Changes current user's password
 */
function changePwd() {
	var http = new XMLHttpRequest();
	var message = document.getElementById('changePwdMessage');
	var token = localStorage.getItem('token');
	var oldPwd = document.getElementsByName('oldLoginPwd')[0].value;
	var newPwd = document.getElementsByName('newLoginPwd')[0].value;
	var newRepeatedPwd = document.getElementsByName('newRepeatedLoginPwd')[0].value;
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			var returnObject = JSON.parse(http.responseText);
			if (returnObject.success) {
				if (newPwd.length < 5) {
					message.innerHTML = 'New password is too short';
					return false;
				} else {
					if (oldPwd != newPwd) {
						if (newPwd == newRepeatedPwd) {
							message.innerHTML = returnObject.message; // Password changed.
							log('Password has been changed');
						} else {
							message.innerText = "New passwords don't match";
							log("New passwords don't match");
							return false;
						}
					} else {
						message.innerHTML = returnObject.message; // Wrong password.
						log('Old and new password are the same');
						return false;
					}
				}
			} else {
				log('returnObject.success is false');
				message.innerHTML = returnObject.message;
			}
		}
	};

	var params = JSON.stringify({
		oldPwd: oldPwd,
		newPwd: newPwd
	});
	XHttpPost(http, '/change_password', params, localStorage.getItem('token'));
	return false;
}

/* ------------------      MISC / XML       ----------------------- */
/**
 * Performs a POST XML HTTP request with given parameters and sets token to header
 */
XHttpPost = function(http, url, params, token) {
	http.open('POST', url, true);
	http.setRequestHeader('Content-Type', 'application/json');
	http.setRequestHeader('token', token);
	http.send(params);
};

/* ------------------      MISC / CONNECT TO SOCKET       ----------------------- */
/**
 * Opens and establishes a websocket connection 
 */
function connectToSocket() {
	var ws = new WebSocket('ws://localhost:8080/websocket');
	var email = localStorage.getItem('email');
	var token = localStorage.getItem('token');
	var socketData = JSON.stringify({
		token: token,
		email: email
	});
	log('Connected to socket with data: ' + socketData);

	ws.onopen = function(event) {
		ws.send('Socket open');
		ws.send(socketData);
	};
	ws.onclose = function(event) {
		log('socket closed');
	};
	ws.onmessage = function(event) {
		if (event.data == 'sign_out') {
			log('signout');
			localStorage.removeItem('token');
			displayView();
		}
	};
	ws.onerror = function() {
		log('Websocket connection error');
	};
}

/* ------------------      MISC / HELPER FUNCTIONS     ----------------------- */
function validateEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}
function checkLocalStorage() {
	log('Token: ' + localStorage.getItem('token'));
	log('Email: ' + localStorage.getItem('email'));
	log('State: ' + localStorage.getItem('currState'));
	log('Last searched user: ' + localStorage.getItem('search'));
}
function clearStorage() {
	if (localStorage) {
		localStorage.clear(); //clears the localstorage
	} else {
		alert('Sorry, no local storage.'); //an alert if localstorage is non-existing
	}
}
/**
 * Get sign up password (and repeated pwd), validate length and similarity
 * @param  {[submit]} signUpForm Data object containing form input on event trigger
 * @return {[bool]} true if sign-up password is OK
 */
validateSignUpPassword = function(signUpForm) {
	var password = signUpForm.signUpPwd.value;
	var repeatedPassword = signUpForm.signUpPwdRepeat.value;
	// Should I check for non-alphanumerical values as well here or is this enough?
	if (password.length < 5 && repeatedPassword != password) {
		log("Password is either too short or doesn't match");
		return false;
	} else return true;
};
/**
 * Auxiliary password validation called onkeyup when signing up user
 */
function checkPass() {
	var pwd = document.getElementById('pass1');
	var repeated = document.getElementById('pass2');
	var message = document.getElementById('signUpMessage');
	var green = '#66cc66';
	var red = '#ff6666';
	if (localStorage.getItem('currState') === 'Account') {
		message = document.getElementById('changePwdMessage');
	}
	if (pwd.value.length > 5) {
		pwd.style.backgroundColor = green;
		message.style.color = green;
		message.innerHTML = 'Character length OK!';
		if (pwd.value == repeated.value) {
			repeated.style.backgroundColor = green;
			message.style.color = green;
			message.innerHTML = 'Password OK!';
		} else {
			repeated.style.backgroundColor = red;
			message.style.color = red;
			message.innerHTML = " These passwords don't match";
		}
	} else {
		pwd.style.backgroundColor = red;
		message.style.color = red;
		message.innerHTML = 'Enter at least 6 digits!';
	}
}
