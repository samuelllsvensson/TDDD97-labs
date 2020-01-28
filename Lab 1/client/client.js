displayView = function(){
    // Check if user is already logged in (token already exists client-side)
    if (localStorage.getItem("token") !== null) {
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        // Get the element with id="defaultOpen" and click on it
        document.getElementById("defaultOpen").click();
        document.getElementById("defaultOpen").style.backgroundColor = "#333";
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
    message.innerHTML = server.message;
    if (server.success) {
        localStorage.token = server.data;
        document.getElementById("view").innerHTML = document.getElementById("profileview").innerHTML;
        return true;
    } else {
        console.log("server.success is false")
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
    // Password is correct
    if(validateSignUpPassword(formData)) {
        // Store values in object for sending to serverstub
        var dataObject = {
            "firstname": formData.firstName.value,
            "familyname": formData.familyName.value,
            "gender": formData.gender.value,
            "city": formData.city.value,
            "country": formData.country.value,
            "email": formData.signUpEmail.value,
            "password": formData.signUpPwd.value
        };
    
        var message = document.getElementById("signUpMessage");
        var server = serverstub.signUp(dataObject);
        // Display potential error message
        message.innerHTML = server.message;
        if (server.success) {
            var result = serverstub.signUp(formData.signUpEmail.value, formData.signUpPwd.value);
            localStorage.token = result.data;
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
 * Get sign-in password (and repeated pwd), validate length and similarity
 * @param  {[submit]} formData Data object containing form input on event trigger
 * @return {[bool]} true if sign-up password is OK
 */
validateSignUpPassword = function(formData) {
    var password = formData.signUpPwd.value;
    var repeatedPassword = formData.signUpPwdRepeat.value;
    // Should I check for non-alphanumerical values as well here or is this enough? 
    if (password.length < 5 && repeatedPassword != password) {
        console.log("Password is either too short or doesn't match");
        return false;
    }
    else
        return true; 
};


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
}
  

