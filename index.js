const path = require('path');
const express = require('express');
const { formatDistance } = require('date-fns');
const userRouter = require('./src/routes/user-router.js');

const PUBLIC_DIR = path.join(__dirname, 'public');
const VIEWS_DIR = path.join(__dirname, 'src/views');

const app = express();

const logReq = (req, res, next) => {
  console.log(`${req.method}: ${req.originalUrl}`);
  next();
};

const injectUrlIntoLocals = (req, res, next) => {
  res.locals.url = req.originalUrl;
  next();
};

const injectDateTimeHumanizerIntoLocals = (req, res, next) => {
  res.locals.humanizeDate = (date) => formatDistance(new Date(), date);
  next();
};

const getPostsAndLoginUser = (req, res, next) => {
  const users = [
    {
      id: 0,
      username: 'batman',
      fullname: 'Bruce Willis',
    },
    {
      id: 1,
      username: 'cat_woman',
      fullname: 'Emma Stone',
    },
  ];
  const posts = [
    {
      user: users[0],
      title: 'My last fight with the Joker',
      post: 'Blah blah blah blah blah blah blah blah...',
      created_at: new Date(new Date().setDate(new Date().getDate() - 1)),
      updated_at: new Date(),
    },
    {
      user: users[1],
      title: 'My favorite food',
      post: 'Meat meat meat meat meat meat meat meat meat...',
      created_at: new Date(new Date().setDate(new Date().getDate() - 0.5)),
      updated_at: new Date(),
    },
  ];
  res.locals.user = users[0];
  res.locals.posts = posts;
  next();
};

app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use(logReq);
app.use(injectUrlIntoLocals);
app.use(injectDateTimeHumanizerIntoLocals);

app.use(getPostsAndLoginUser);

app.get('/', (req, res) => {
  res.render('index', { title: 'Odin Members Only' });
});

app.use('/user', userRouter);

if (!process.env.SERVERLESS_FUNCTION) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on port ${PORT}`));
}
