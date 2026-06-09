















$(document).ready(function(){
    wipeMenu();
});

async function wipeMenu() {
    console.log("wiping menu items");
    $('#menuSpecificOptions').html("");
}

$("#trackModeButton").click(function(){
    $("#contentTitle").html("Track Mode");
    navigateToPage("trackMenu");
});

$("#mapModeButton").click(function(){
    $("#contentTitle").html("Map Mode");
    navigateToPage("mapMenu");
});

$("#quit").click(function(){
    alert('clicked!');
});

