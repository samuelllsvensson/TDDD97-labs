/*
 * client.js is used to validate, change views, passwords and post messages
 * Author: Samuel Svensson 
 */

/* ------------------      MAIN       ----------------------- */ 
displayView = function(){
    // Check if user is already logged in (token already exists client-side)
    if (localStorage.getItem("token") !== null) {
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        document.getElementById("defaultOpen").click();
        document.getElementById("defaultOpen").style.backgroundColor = "#333";     
        displayHome();
        updateMessages();  
    } else { // First time user 
        document.getElementById("view").innerHTML = document.getElementById("welcomeview").innerHTML;
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
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].style.backgroundColor = "";
    }
    document.getElementById(pageName).style.display = "block";
};
/* ------------------      LOGIN       ----------------------- */ 
/**
 * Validates login form input and store token
 * @param  {[submit]} formData Data object containing form input on event trigger
 * @return {[bool]} true if sign-up was successful
 */
logInValidation = function(signInForm) {
    var message = document.getElementById("signInMessage");
    var mailOk = validateEmail(signInForm.logInEmail.value);
    if(mailOk) {
        var server = serverstub.signIn(signInForm.logInEmail.value, signInForm.loginPwd.value);
        if (server.success) {
            localStorage.token = server.data;
            console.log("Logged in user:"+ localStorage.token);
            // Display home view
            document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
            document.getElementById("defaultOpen").click();
            document.getElementById("defaultOpen").style.backgroundColor = "#333";
            displayHome();
            updateMessages();
            return true;
        } else {
            console.log("server.success is false");
            message.innerHTML = server.message; // Wrong username or password.
            return false;
        }
    } else {
        console.log("Inputted email not valid");
        message.innerText = "Inputted email not valid";
        return false;
    }
};


/* ------------------      SIGNUP         ----------------------- */ 
/**
 * Validates sign-up form input using checkSignUpPassword and store token
 * @param  {[submit]} formData Data object containing form input on event trigger
 * @return {[bool]} true if sign-up was successful
 */
signUpValidation = function(signUpForm) {
    var mailOk = validateEmail(signUpForm.signUpEmail.value);
    var message = document.getElementById("signInMessage");
    if(mailOk) {
        if(validateSignUpPassword(signUpForm)) {
            // Store values in object for sending to server
            var dataObject = {
                "firstname": signUpForm.firstName.value,
                "familyname": signUpForm.familyName.value,
                "gender": signUpForm.gender.value,
                "city": signUpForm.city.value,
                "country": signUpForm.country.value,
                "email": signUpForm.signUpEmail.value,
                "password": signUpForm.signUpPwd.value
            };
            var server = serverstub.signUp(dataObject);
            if (server.success) {
                var result = serverstub.signIn(signUpForm.signUpEmail.value, signUpForm.signUpPwd.value);
                localStorage.token = result.data;
                console.log("Signed up user:"+ localStorage.token);
                document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
                document.getElementById("defaultOpen").click();
                document.getElementById("defaultOpen").style.backgroundColor = "#333";
                displayHome();
                updateMessages();
                return true;
            }
            return false;
        }
        else {
            console.log("validateSignUpPassword is false");
            message.innerText = "Inputted password is either too short or doesn't match";
            return false;
        }
    } else {
        console.log("Inputted email not valid");
        message.innerText = "Inputted email not valid";
        return false;
    }
};
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
        console.log("Password is either too short or doesn't match");
        return false;
    }
    else
        return true; 
};

/**
 * Auxiliary password validation called onkeyup when signing up user
 */
function checkPass()
{
    var pwd = document.getElementById("pass1");
    var repeated = document.getElementById("pass2");
    var message = document.getElementById("signUpMessage");
    var green = "#66cc66";
    var red = "#ff6666";
 	
    if(pwd.value.length > 5) {
        pwd.style.backgroundColor = green;
        message.style.color = green;
        message.innerHTML = "Character length OK!";
        if(pwd.value == repeated.value) {
            repeated.style.backgroundColor = green;
            message.style.color = green;
            message.innerHTML = "Password OK!";
        } else {
            repeated.style.backgroundColor = red;
            message.style.color = red;
            message.innerHTML = " These passwords don't match";      
        }
    } else {
        pwd.style.backgroundColor = red;
        message.style.color = red;
        message.innerHTML = "Enter at least 6 digits!";
    }
}  


/* ------------------      HOME / DISPLAY INFO       ----------------------- */ 
/**
 * Displays current personal info of logged in user 
 */
function displayHome() {
    var email = serverstub.getUserDataByToken(localStorage.getItem("token")).data.email;

    var userdata = serverstub.getUserDataByEmail(localStorage.getItem("token"), email).data;
    document.getElementById("LName").innerHTML = userdata.firstname;
    document.getElementById("LFamilyName").innerHTML = userdata.familyname;
    document.getElementById("LGender").innerHTML = userdata.gender;
    document.getElementById("LCity").innerHTML = userdata.city;
    document.getElementById("LCountry").innerHTML = userdata.country;
    document.getElementById("LEmail").innerHTML = userdata.email;
    updateMessages();
};
/* ------------------      HOME / POST MESSAGE       ----------------------- */ 
/**
 * Changes current tab view
 * @param  {[submit]} messageData Form data containing message to post
 */
 function postMessage() {
    var token = localStorage.getItem("token");
    var postedMessage = document.getElementsByName("areaText");
    postedMessage = postedMessage[0].value;
    var toEmail = serverstub.getUserDataByToken(token).data.email;
    server = serverstub.postMessage(token, postedMessage, toEmail);
    updateMessages(toEmail);
    document.getElementsByName("areaText")[0].value = "";
    return server.success;
};
/* ------------------      HOME / UPDATE MESSAGES     ----------------------- */ 
/**
 * Updates all messages posted by user (and others)
 */ 
function updateMessages(email) {
    var token = localStorage.getItem("token");
    // First time user 
    if (email == null) {
        email = serverstub.getUserDataByToken(token).data.email;
    }
    var messages = serverstub.getUserMessagesByEmail(token, email).data;
    var container = document.getElementById("allMessages");
    var returnList = "";
    messages.forEach(function(item){
        returnList += "<div>"+  item.writer + ": " +  item.content + "</div>";
    });
    container.innerHTML = returnList;
    return messages.success;
};

/* ------------------      BROWSE / SEARCH USER       ----------------------- */ 
/**
 * Displays searched user personal info
 * @param  {[string]} searchedUser Email of searched user
 */
function searchUser() {
    var token = localStorage.getItem("token");
    var userEmail = document.getElementById("searchedEmail").value; 
    var errorMessage = document.getElementById("emailError");
    var mailOk = validateEmail(userEmail);
    if(mailOk) {
        var response = serverstub.getUserDataByEmail(token, userEmail);
        if(response.success) {
            var userdata = response.data;
            console.log("Searched for user: " + userEmail);
            document.getElementById("OName").innerHTML = userdata.firstname;
            document.getElementById("OFamilyName").innerHTML = userdata.familyname;
            document.getElementById("OGender").innerHTML = userdata.gender;
            document.getElementById("OCity").innerHTML = userdata.city;
            document.getElementById("OCountry").innerHTML = userdata.country;
            document.getElementById("OEmail").innerHTML = userdata.email;
            updateBrowseMessages(userEmail);
        } else {
            errorMessage.innerHTML = response.message;
        }
        return false;
    } else {
        errorMessage.innerText = "Inputted email is not valid";
        console.log("Inputted email is not valid");
    }
    return false;
};
/* ------------------      BROWSE / POST BROWSE MESSAGE       ----------------------- */ 
/**
 * Posts message to wall in Browse tab
 * @param  {[string]} toEmail Searched email
 */
function postBrowseMessage() {
    console.log("Browse message posted");
    var token = window.localStorage.getItem("token");
    var userEmail = document.getElementById("searchedEmail").value; 

    var text = document.getElementById("areaBrowseText").value;
    serverstub.postMessage(token, text, userEmail);
    text = "";
    updateBrowseMessages(userEmail);
};
/* ------------------      BROWSE / UPDATE BROWSE MESSAGES       ----------------------- */ 
/**
 * Updates message list whilst in Browse tab to see own posts and others. 
 * @param  {[string]} email Searched email
 */
function updateBrowseMessages(email) {
    // First time user 
    var token = localStorage.getItem("token");
    var userEmail = document.getElementById("searchedEmail").value; 
    if (email == null) {
        email = serverstub.getUserDataByToken(token).data.email;
    }
    var messages = serverstub.getUserMessagesByEmail(token, userEmail).data;
    var container = document.getElementById("allBrowseMessages");
    var returnList = "";
    messages.forEach(function(item){
        returnList += "<div>"+  item.writer + ": " +  item.content + "</div>";
    });
    console.log("Browse messages refreshed");
    container.innerHTML = returnList;
    return messages.success;
};

/* ------------------      ACCOUNT / SIGN OUT       ----------------------- */ 
/**
 * Signs out the current user and delete token
 */
function signOut() {
    var token = localStorage.getItem("token");
    localStorage.removeItem("token");
    serverstub.signOut(token);
    console.log("Signed out user:" + token);
    document.getElementById("view").innerHTML = document.getElementById("welcomeview").innerHTML;
};
/* ------------------      ACCOUNT / CHANGE PWD      ----------------------- */ 
/**
 * Changes current user's password
 * @param  {[submit]} changePwdForm Data object containing form input on event trigger
 * @return {[object]} serverstub object 
 */
function changePwd(changePwdForm) {
    var message = document.getElementById("changePwdMessage");
    var token = localStorage.getItem("token");
    var oldPwd = changePwdForm.oldLoginPwd.value;
    var newPwd = changePwdForm.newLoginPwd.value;
    var newRepeatedPwd = changePwdForm.newRepeatedLoginPwd.value;

    if(newPwd.length < 5) {
        message.innerHTML = "New password is too short";
        return false;
    } else {
        if(oldPwd != newPwd) {
            if(newPwd == newRepeatedPwd) {
                var server = serverstub.changePassword(token, oldPwd, newPwd);
                message.innerHTML = server.message; // Password changed.
                console.log("password has been changed");
            } else {
                message.innerText = "New passwords don't match";
                console.log("New passwords don't match");
                return false;
            }   
        } else{
            message.innerHTML = server.message; // Wrong password.
            console.log("Old and new password don't match");
            return false;
        }    
    }
    return server.success;
};
/* ------------------      MISC      ----------------------- */ 
/**
 * Check's email input validity using RegEx object
 * @param  {[string]} email Inputted email string
 * @return {[bool]} True if valid email
 */
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};