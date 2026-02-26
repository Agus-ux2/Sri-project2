function handler(event) {
    var request = event.request;
    var headers = request.headers;
    var host = headers.host.value;

    // Redirigir www a naked domain
    if (host === 'www.solucionesruralesintegradas.com.ar') {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                "location": { "value": "https://solucionesruralesintegradas.com.ar" + request.uri }
            }
        };
    }

    // Retornar request original si no es www
    return request;
}
