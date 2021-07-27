module.exports = function(app) {
  app.use(
    '*/logout*',
    (req, res) => {console.log('LOGOUT'); res.sendFile('public/logout.html')}
  );
};