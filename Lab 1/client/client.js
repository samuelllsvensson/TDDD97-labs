displayView = function(){
    // Check if user is already logged in (token already exists client-side)
    if (localStorage.getItem("token") !== null) {
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        document.getElementById("defaultOpen").click();
        document.getElementById("defaultOpen").style.backgroundColor = "#333";
        displayHome();
    } else {
        document.getElementById("view").innerHTML = document.getElementById("welcomeview").innerHTML;
    }
};

window.onload = function() {
    displayView();
};

/* ------------------      LOGIN       ----------------------- */ 
/**
 * Validates login form input and store token
 * @param  {[submit]} formData Data object containing form input on event trigger
 * @return {[bool]} true if sign-up was successful
 */
logInValidation = function(signInForm) {
    var message = document.getElementById("signInMessage");

    var server = serverstub.signIn(signInForm.logInEmail.value, signInForm.loginPwd.value);
    if (server.success) {
        localStorage.token = server.data;
        console.log("Logged in user:"+ localStorage.token);
        // Display home view
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        document.getElementById("defaultOpen").click();
        document.getElementById("defaultOpen").style.backgroundColor = "#333";

        // Display personal info
        displayHome();
        return true;
    } else {
        console.log("server.success is false")
        message.innerHTML = server.message; // Wrong username or password.
        return false;
    }
};


/* ------------------      SIGNUP         ----------------------- */ 
/**
 * Validates sign-up form input using checkSignUpPassword and store token
 * @param  {[submit]} formData Data object containing form input on event trigger
 * @return {[bool]} true if sign-up was successful
 */
signUpValidation = function(formData) {
    if(validateSignUpPassword(formData)) {
        // Store values in object for sending to server
        var dataObject = {
            "firstname": formData.firstName.value,
            "familyname": formData.familyName.value,
            "gender": formData.gender.value,
            "city": formData.city.value,
            "country": formData.country.value,
            "email": formData.signUpEmail.value,
            "password": formData.signUpPwd.value
        };
    
        var server = serverstub.signUp(dataObject);
        if (server.success) {
            var result = serverstub.signUp(formData.signUpEmail.value, formData.signUpPwd.value);
            localStorage.token = result.data;
            console.log("Signed up user:"+ localStorage.token);
            document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
            return true;
        }
        return false;
    }
    else {
        console.log("validateSignUpPassword is false");
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
    if(newPwd.length < 5) {
        message.innerHTML = "New password is too short";
        return false;
    }
    else {
        if(oldPwd != newPwd) {
            var server = serverstub.changePassword(token, oldPwd, newPwd);
            message.innerHTML = server.message; // Password changed.
            console.log("password has been changed");
        }
        else{
            message.innerHTML = server.message; // Wrong password.
            return false;
        }    
    }
    return server.success;
};

/* ------------------      HOME / DISPLAY INFO       ----------------------- */ 
/**
 * Displays current personal info of logged in user
 */
function displayHome() {
    email = serverstub.getUserDataByToken(localStorage.getItem("token")).data.email;

    var userdata = serverstub.getUserDataByEmail(localStorage.getItem("token"), email).data;
    document.getElementById("LName").innerHTML = userdata.firstname;
    document.getElementById("LFamilyName").innerHTML = userdata.familyname;
    document.getElementById("LGender").innerHTML = userdata.gender;
    document.getElementById("LCity").innerHTML = userdata.city;
    document.getElementById("LCountry").innerHTML = userdata.country;
    document.getElementById("LEmail").innerHTML = userdata.email;
};
/* ------------------      HOME / POST MESSAGE       ----------------------- */ 
/**
 * Changes current tab view
 * @param  {[submit]} messageData Form data containing message to post
 */
function postMessage(messageData) {
};
/* ------------------      HOME / RELOAD MESSAGES       ----------------------- */ 
/**
 * Updates all messages posted by user (and others)
 */
function updateMessages() {
};


/* ------------------      BROWSE / SEARCH USER       ----------------------- */ 
/**
 * Displays searched user personal info
 * @param  {[string]} searchedUser Email of searched user
 */
function searchUser(searchedUser) {

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