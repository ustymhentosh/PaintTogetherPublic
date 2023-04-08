var conversation = document.getElementById('chat')
var input = document.getElementById('message')

// recieves chat updates
function update() {
    $.ajax({
        url: "/update_chat",
        type: "get",
        success: function (response) {
            document.getElementById('chat').innerHTML = response;
        },
        error: function (xhr) { }
    });
}

function clearInput() {
    var getValue = document.getElementById("message");
    if (getValue.value != "") {
        getValue.value = "";
    }
}

input.addEventListener("keypress", function (event) {
    console.log(1)
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        document.getElementById("send-button").click();
    }
});


var update = setInterval(update, 1000);

function send_message(message) {
    let post_request = new XMLHttpRequest();
    let url = "/update_chat";
    post_request.open("POST", url, true);
    post_request.setRequestHeader("Content-Type", "text/plain");
    post_request.send(message);
}

document.getElementById("send-button").addEventListener("click", function () {
    var message = document.getElementById("message").value;
    send_message(message);
    clearInput()
    let scroll_to_bottom = document.getElementById('chat');
    scroll_to_bottom.scrollTop = scroll_to_bottom.scrollHeight;
});

