window.DEN_CONFIG = {
  // Set to the public HTTPS address of the new server followed by /api.
  apiUrl: ['localhost','127.0.0.1'].includes(location.hostname)
    ? 'http://'+location.hostname+':8080/api'
    : 'https://87.242.85.129.sslip.io/api'
};
