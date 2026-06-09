


/..
async function menuOpenClose() {
    if (!$("#menu").is(":animated")) {
        if ($("#menu").is(":hidden")) {
            $("#menu").show("1000");
        } else {
            $("#menu").hide("1000");
        }
    }
}

async function toggleDiv(name) {
    if ($("#" + name + "Checkbox").is(":checked")) {
        $("#" + name).show();
        localStorage.setItem(name, 'true');
    } else {
        $("#" + name).hide();
        localStorage.setItem(name, 'false');
    }
}

async function toggleDarkMode() {
    if ($("#darkModeCheckbox").is(":checked")) {
        $("html").attr('data-theme', 'dark');
        localStorage.setItem('darkMode', 'true');
    } else {
        $("html").attr('data-theme', 'light');
        localStorage.setItem('darkMode', 'false');
    }
}
../

// Function to toggle menu visibility
function menuOpenClose() {
    const menu = $("#menu");
    if (!menu.is(":animated")) {
        const shouldShow = menu.is(":hidden");
        UIHelper.toggleVisibility('menu', shouldShow);
    }
}

// Function to handle toggling of div visibility based on checkbox state
function toggleDiv(name) {
    const checkboxState = $("#" + name + "Checkbox").is(":checked");
    UIHelper.toggleVisibility(name, checkboxState);
    StorageHelper.setItem(name, checkboxState.toString());
}

// Function to toggle dark mode based on checkbox state
function toggleDarkMode() {
    const isDarkMode = $("#darkModeCheckbox").is(":checked");
    const theme = isDarkMode ? 'dark' : 'light';
    UIHelper.setTheme(theme);
    StorageHelper.setItem('darkMode', isDarkMode.toString());
}
