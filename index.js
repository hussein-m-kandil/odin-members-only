const path = require('path');
const express = require('express');
const { formatDistance } = require('date-fns');

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

app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use(logReq);
app.use(injectUrlIntoLocals);

const users = [
  {
    username: 'batman',
    fullname: 'Bruce Willis',
  },
  {
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

app.get('/', (req, res) => {
  const humanizeDate = (date) => {
    return formatDistance(new Date(), date);
  };
  res.render('index', { title: 'Odin Members Only', posts, humanizeDate });
});

if (!process.env.SERVERLESS_FUNCTION) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Running on port ${PORT}`));
}
