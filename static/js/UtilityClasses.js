class StorageHelper {
    static getItem(key) {
        return localStorage.getItem(key);
    }

    static setItem(key, value) {
        localStorage.setItem(key, value);
    }
}


class UIHelper {
    static toggleVisibility(elementId, shouldShow) {
        const element = $("#" + elementId);
        if (!element.is(":animated")) {
            shouldShow ? element.show("1000") : element.hide("1000");
        }
    }

    static toggleCheckbox(checkboxId, isChecked) {
        $("#" + checkboxId).prop('checked', isChecked);
    }

    static setTheme(theme) {
        $("html").attr('data-theme', theme);
    }
}
