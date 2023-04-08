"use strict";

var click_enabled = JSON.parse(access); // prevents users that aren't logged in from changing the grid
const size = 528; // size of grid | first delete json if you need to change it
const pixel_size = Math.trunc(Math.sqrt(size));
var timer_command = JSON.parse(timer_command);

var zoomLevel = 1;

var canvas = document.getElementById('canvas'), // canvas itself
    context = canvas.getContext('2d'),
    pixels = JSON.parse(grid);

// canvas properiies
canvas.height = (size + 1) * zoomLevel;
canvas.width = (size + 1) * zoomLevel;

let offsetX = 0; // current x-offset of grid
let offsetY = 0; // current y-offset of grid


context.lineWidth = 1
context.strokeStyle = '#ccc';

var seconds = 0 // timer value
if (timer_command === true) {
    seconds = 0
    var intervalId = 0 // timer repeat
} else if (timer_command > 0) {
    seconds = Math.floor(timer_command)
    intervalId = setInterval(timer, 1000);
}
var highlightedPixel = { 'x': -1, 'y': -1 }; // pixel to highlight

// dictionary of colors
var dct_of_colors = {
    '#FFFFFF': 'white',
    '#bababa': 'light-gray',
    '#676565': 'dark-gray',
    '#000000': 'black',
    '#FC7BFF': 'pink',
    '#FF0000': 'red',
    '#FF7C32': 'orange',
    '#7B5D39': 'brown',
    '#EBFF05': 'yellow',
    '#B5FF7C': 'lime',
    '#00A72F': 'green',
    '#3FC5C5': 'light-blue',
    '#188FE5': 'blue',
    '#002d9e': 'dark-blue',
    '#87438D': 'light-purple',
    '#660177': 'purple'
}


// repaints grid when adding color and does highlighting
function repaintGrid() {
    for (var key in pixels) {
        let pixel = pixels[key]
        context.fillStyle = pixel.color;
        context.fillRect(pixel.x * zoomLevel, pixel.y * zoomLevel, pixel_size * zoomLevel, pixel_size * zoomLevel);
        context.strokeRect(pixel.x * zoomLevel, pixel.y * zoomLevel, pixel_size * zoomLevel, pixel_size * zoomLevel);

        // check if mouse is over this pixel
        if (highlightedPixel !== null && pixel.x === highlightedPixel.x && pixel.y === highlightedPixel.y) {
            context.strokeStyle = document.getElementById("my-form")['color_choice'].value;
            context.lineWidth = 1;
            context.strokeRect(pixel.x * zoomLevel + 1, pixel.y * zoomLevel + 1, pixel_size * zoomLevel - 2, pixel_size * zoomLevel - 2);
            context.strokeStyle = '#ccc';
            context.lineWidth = 1;
        }
    }
    context.strokeRect(0.5, 0.5, canvas.width * zoomLevel - 1, canvas.height * zoomLevel - 1);
}



// recieves grid updates
setInterval(function () {
    $.ajax({
        url: "/update_grid",
        type: "get",
        success: function (response) {
            pixels = JSON.parse(response);
            repaintGrid();
        },
        error: function (xhr) { }
    });
}, 1000);


// saves grid into json file
function saveGrid(data) {
    let post_request = new XMLHttpRequest();
    let url = "save_grid";

    post_request.open("POST", url, true);
    post_request.setRequestHeader("Content-Type", "application/json");

    let json = JSON.stringify(data);

    post_request.send(json);
}


// starts timer depending on seconds
function timer() {
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;

    remainingSeconds = remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;
    document.getElementById("timer").innerHTML = "Timer: " + minutes + ":" + remainingSeconds;
    if (seconds === 0) {
        clearInterval(intervalId);
        document.getElementById("timer").innerHTML = "Free to fill";
    } else {
        seconds = seconds - 1;
    }
}

function change_timere_in_db() {
    let post_request = new XMLHttpRequest();
    let url = "change_timere_in_db";

    post_request.open("POST", url, true);
    post_request.setRequestHeader("Content-Type", "application/json");

    let json = JSON.stringify({ 'to_do': 'True' });

    post_request.send(json);
}

function make_history(coords_color) {
    let post_request = new XMLHttpRequest();
    let url = "make_history";

    post_request.open("POST", url, true);
    post_request.setRequestHeader("Content-Type", "application/json");

    let json = JSON.stringify(coords_color);

    post_request.send(json);
}



// God knows how it works, but it controls highlighting of cells
canvas.addEventListener('mousemove', function (event) {
    const rect = canvas.getBoundingClientRect();
    let x = Math.floor(((event.clientX - rect.left) / zoomLevel) / rect.width * canvas.width);
    let y = Math.floor(((event.clientY - rect.top) / zoomLevel) / rect.height * canvas.height);
    let x1 = (x - x % pixel_size) / pixel_size;
    let y1 = (y - y % pixel_size) / pixel_size;
    var status = document.getElementById('status');
    // status.innerHTML = 'x: ' + Math.min(x1, size / pixel_size - 1) + ' | ' + 'y: ' + Math.min(y1, size / pixel_size - 1);
    status.innerHTML = 'x: ' + x1 + ' | ' + 'y: ' + y1;

    // find the pixel under the mouse
    let key = Math.min(x1, size / pixel_size - 1) + ' ' + Math.min(y1, size / pixel_size - 1);
    let pixel = pixels[key];

    // if the pixel is different from the highlighted one, update the highlight
    if (pixel !== highlightedPixel && click_enabled) {
        highlightedPixel = pixel;
        repaintGrid();
    }
});

var previousX = null;
var previousY = null;
var dropTimeout = null;

function dropPixels(e) {
  if (previousX !== null && previousY !== null) {
    if (previousX !== e.offsetX || previousY !== e.offsetY) {
      var button = e.target;
      var numPixels = 1; // number of pixels to drop
      var startX = e.offsetX - 2;
      var startY = e.offsetY - 2;
      
      // Calculate the distance of the cursor movement
      var distance = Math.sqrt(Math.pow(startX - previousX, 2) + Math.pow(startY - previousY, 2));
      // Calculate the duration of the animation based on the distance and a base speed of x pixels/second (1000*1000)
      var duration = Math.max(100, Math.min(2000, distance / 100000 * 1000));
      
      // Clear the previous timeout (if any) and start a new one
      clearTimeout(dropTimeout);
      dropTimeout = setTimeout(function() {
        for (var i = 0; i < numPixels; i++) {
          var pixel = document.createElement("div");
          pixel.classList.add("pixel");
          button.appendChild(pixel);

          pixel.style.left = startX + "px";
          pixel.style.top = startY + "px";

          var red = Math.floor(Math.random() * 256);
          var green = Math.floor(Math.random() * 256);
          var blue = Math.floor(Math.random() * 256);
          var color = "rgb(" + red + "," + green + "," + blue + ")";
          pixel.style.backgroundColor = color;

          var targetY = button.offsetHeight - 4;
          var intervalId = setInterval(function() {
            var currentY = parseInt(pixel.style.top);
            var newY = currentY + 2;
            pixel.style.top = newY + "px";
            if (newY >= targetY) {
              clearInterval(intervalId);
              pixel.remove();
            }
          }, 30);
        }
      }, 5); // delay before dropping pixels
    }
  }
  previousX = startX;
  previousY = startY;
}
var myButton = document.getElementById("confirm_button");
myButton.addEventListener("mousemove", dropPixels);


// takes highlighting away when mouse not on grid
canvas.addEventListener('mouseout', function (event) {
    // reset the highlighted pixel
    highlightedPixel = null;
    repaintGrid();
});


// clicks on canvas: shows modal if free to fill
canvas.addEventListener('click', function (event) {
    const rect = canvas.getBoundingClientRect();
    let x = Math.floor(((event.clientX - rect.left) / zoomLevel) / rect.width * canvas.width);
    let y = Math.floor(((event.clientY - rect.top) / zoomLevel) / rect.height * canvas.height);
    let x1 = (x - x % pixel_size) / pixel_size;
    let y1 = (y - y % pixel_size) / pixel_size;
    var timer_show = document.getElementById("timer").textContent;
    if (!document.getElementById("my-form")['color_choice'].value) { }
    else if (timer_show !== "Free to fill") {
        console.log('All good')
    } else if (click_enabled) {
        modal.style.display = "block";
        document.getElementById('tell_coords').innerHTML = 'x: ' + x1 + ' ' + 'y: ' + y1
        document.getElementById('tell_color').innerHTML = 'Color: ' + dct_of_colors[document.getElementById("my-form")['color_choice'].value]
    }
}, false);


// password visibility letters or dots
function password_visibility() {
    var x = document.getElementById("user_password");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
}


// Get the modal
var modal = document.getElementById("myModal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
    modal.style.display = "none";
}
// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// confirm button
var btn = document.getElementById("confirm_button");


// confirm button click actions |starting timer|painting|
btn.addEventListener('click', function (event) {
    modal.style.display = "none";
    document.getElementById("timer").innerHTML = "Starting timer";
    let history_mark = {}
    let grid_update = {}

    let coords = document.getElementById('tell_coords').innerHTML;
    let new_color_code = document.getElementById("my-form")['color_choice'].value;
    let new_color = dct_of_colors[document.getElementById("my-form")['color_choice'].value];
    let clean_coords = coords.split(' ')[1] + ' ' + coords.split(' ')[3]

    grid_update[clean_coords] = { 'color': new_color_code, 'x': coords.split(' ')[1] * pixel_size + 0.5, 'y': coords.split(' ')[3] * pixel_size + 0.5, }

    let newPixels = pixels

    pixels[clean_coords].color = new_color_code;
    newPixels[clean_coords].color = new_color_code;


    repaintGrid()
    saveGrid(grid_update)
    history_mark[clean_coords] = new_color
    make_history(history_mark)

    // setting secconds angain
    seconds = 20
    change_timere_in_db()


    intervalId = setInterval(timer, 1000);
}, false);


// painting grid at the very begining
if (pixels == null) {
    pixels = {}
    for (let i = 0; i < canvas.height / pixel_size; i += 1) {
        for (let j = 0; j < canvas.width / pixel_size; j += 1) {
            pixels[i + ' ' + j] = {
                x: i * pixel_size + 0.5,
                y: j * pixel_size + 0.5,
                color: 'white',
            };
        }
    }
    saveGrid(pixels)
}


repaintGrid()