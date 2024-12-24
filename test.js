const webview = document.getElementById('webview');

webview.addEventListener('did-start-loading', () => {
    console.log(`Webview is loading: ${webview.src}`);
});

webview.addEventListener('did-finish-load', () => {
    console.log(`Webview finished loading: ${webview.src}`);
});

webview.addEventListener('did-fail-load', (event) => {
    console.error(`Failed to load URL: ${event.validatedURL}, Error: ${event.errorCode}`);
});
