$(document).ready(function(){
    console.log("doc is ready");
    darkModeCheck();
    settingsCheck();
    pageCheck();
});



async function pageCheck() {
    console.log("PAGE CHECK");
    console.log("This is the page right after refresh" + localStorage.getItem("page"));
    switch(localStorage.getItem("page")) {
        case "mapMenu":
        case "trackMenu":
        case "mainMenu":
            navigateToPage(localStorage.getItem("page"));
            break;
        default:
            console.log("Default activated");
            localStorage.setItem("page", "mainMenu");
            console.log(localStorage.getItem("page"));
            navigateToPage(localStorage.getItem("page"));
            break;
    }
}

async function darkModeCheck() {
    console.log("DARK MODE CHECK");
    if (localStorage.getItem('darkMode') === 'true') {
        $("html").attr('data-theme', 'dark');
    }
}

async function settingsCheck() {
    let backendDataNames = ["longditude","latitude","altitude","accuracy","RTKFix","sattelites","hdop","correctionAge","savedPoints,metAccuracyTarget"]
    backendDataNames.forEach((name) => {
        if (localStorage.getItem(name) === 'false') {
            $('#' + name + "Checkbox").prop('checked, false');
            toggleDiv(name);
        }
    });
}
