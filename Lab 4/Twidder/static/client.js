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
		document.getElementById('defaultOpen').style.backgroundColor = '#333';
		connectToSocket();
		if (localStorage.getItem('state') === null) {
			localStorage.setItem('state', 'Home');
		}
		openPage('Home');

		displayHome();
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
	localStorage.setItem('state', pageName);
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
var isLocal = false;
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
					if (!isLocal) {
						connectToSocket();
					}
					openPage('Home');
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
				var returnList = '';
				if (messageData.length > 0) {
					messageData.forEach((item) => {
						returnList += '<div>' + item[0] + ': ' + item[1] + '</div>';
					});
				} else if (messageData.length == 0) {
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
	var empty = 'No messages yet!';
	http.onreadystatechange = function(ev) {
		if (http.readyState == 4 && http.status == 200) {
			var returnObject = JSON.parse(http.responseText);
			if (returnObject.success) {
				var messageData = returnObject.data;
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
				localStorage.removeItem('state');
				localStorage.removeItem('search');
				localStorage.removeItem('email');
				log('Logging out user...');
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
 * Performs a POST XML HTTP request with given parameters and sets token to request header
 */
XHttpPost = function(http, url, params, token) {
	http.open('POST', url, true);
	http.setRequestHeader('Content-Type', 'application/json');
	if (token) {
		http.setRequestHeader('token', token);
	}
	http.send(params);
};

/* ------------------      MISC / CONNECT TO SOCKET       ----------------------- */
/**
 * Opens and establishes a websocket connection, updates charts etc
 */
function connectToSocket() {
	var ws = new WebSocket('ws://' + document.domain + ':8080/websocket');
	ws.onopen = function(event) {
		var token = localStorage.getItem('token');
		ws.send(token);
	};
	ws.onmessage = function(event) {
		var message = JSON.parse(event.data);
		console.debug('WebSocket message received:', message);
		if (message.data === 'sign_out') {
			localStorage.removeItem('token');
			ws.close();
			isLocal = false;
			displayView();
		}
		if (message.dataMsg === 'posts') {
			var canvas = document.getElementById('postsChart');
			var ctx = canvas.getContext('2d');
			var data = {
				datasets: [
					{
						data: [ message.my_posts, message.total_posts - message.my_posts ],
						backgroundColor: [ '#d843a9', '#f5b6cd' ]
					}
				],
				labels: [ 'Twidposts on my wall', 'Others twidposts' ]
			};
			var config = {
				type: 'doughnut',
				data: data,
				options: {
					responsive: true,
					legend: {
						position: 'right',
						labels: {
							fontColor: 'black'
						}
					},
					title: {
						display: true,
						text: 'Global Twidposts'
					},
					animation: {
						animateScale: true,
						animateRotate: true
					}
				}
			};
			window.myDoughnut = new Chart(ctx, config);
		}

		if (message.dataMsg === 'users') {
			var canvas = document.getElementById('usersChart');
			var ctx = canvas.getContext('2d');
			var data = {
				datasets: [
					{
						data: [ message.online_users, message.total_users - message.online_users ],
						backgroundColor: [ '#57c56f', '#bbbbbb' ]
					}
				],
				labels: [ 'Active twiddors', 'Offline twiddors' ]
			};
			var config = {
				type: 'doughnut',
				data: data,
				options: {
					responsive: true,
					legend: {
						position: 'right',
						labels: {
							fontColor: 'black'
						}
					},
					title: {
						display: true,
						text: 'Global twiddors'
					},
					animation: {
						animateScale: true,
						animateRotate: true
					}
				}
			};
			window.myDoughnut = new Chart(ctx, config);
		}
	};
	ws.onclose = function(event) {
		console.debug('WebSocket closed:', event);
	};
	isLocal = true;
}
/* ------------------      MISC / RESET PASSWORD     ----------------------- */
/**
 * Resets and sends email to server
 */
function resetPassword() {
	var userEmail = document.getElementById('resetEmail').value;
	var oldPwd = document.getElementsByName('oldResetLoginPwd')[0].value;

	var mailOk = validateEmail(userEmail);
	var errorMessage = document.getElementById('resetMessage');
	if (mailOk) {
		var http = new XMLHttpRequest();
		http.onreadystatechange = function(ev) {
			if (http.readyState == 4 && http.status == 200) {
				var returnObject = JSON.parse(http.responseText);
				if (returnObject.success) {
					errorMessage.innerHTML = returnObject.message;
				} else {
					errorMessage.innerHTML = returnObject.message;
				}
			}
		};
		var url = '/reset_password';
		var params = JSON.stringify({
			email: userEmail,
			oldPwd: oldPwd
		});

		XHttpPost(http, url, params);
		return false;
	} else {
		errorMessage.innerText = 'Inputted email is not valid';
		log('Inputted email is not valid');
	}
	return false;
}
/* ------------------      MISC / HELPER FUNCTIONS     ----------------------- */
function validateEmail(email) {
	var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(String(email).toLowerCase());
}
function checkLocalStorage() {
	log('Token: ' + localStorage.getItem('token'));
	log('Email: ' + localStorage.getItem('email'));
	log('State: ' + localStorage.getItem('state'));
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
	if (localStorage.getItem('state') === 'Account') {
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
function goResetView() {
	document.getElementById('view').innerHTML = document.getElementById('resetview').innerHTML;
}
function goWelcomeView() {
	document.getElementById('view').innerHTML = document.getElementById('welcomeview').innerHTML;
}
