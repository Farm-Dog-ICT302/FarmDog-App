async function requestCSVRecord() {
    console.log("Sending CSV output request to server.");
    try {
        const response = await fetch("/CSVOutput");
        const data = await response;
        console.log(response);
    } catch (error) {
        console.error("error requesting CSV Output:", error);
    }
}
