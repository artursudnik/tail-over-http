const asyncHandler = require('express-async-handler'),
      router       = require('express').Router();

module.exports = router;

router.get('/', asyncHandler(async (req, res) => {
    res.status(501).render('index', {pageTitle: 'Application not implemented'})
}));
