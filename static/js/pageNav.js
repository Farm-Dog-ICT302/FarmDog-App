

async function navigateToPage(pageName) {
    localStorage.setItem("page", pageName);
    console.log("polling /" + pageName);
    $.ajax({
        url: '/' + pageName,
        type: 'GET',
        success: function(data) {
            //Inject HTML into a container
            $('#mainContent').html(data);
        },
        error: function(xhr, status, error) {
            console.error("AJAX error:" + status + error);
        }
    });
}
