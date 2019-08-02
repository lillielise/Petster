'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');

// Environment variables
require('dotenv').config();

// Global Variables



// Database set up
const client = new pg.Client(process.env.DATABASE_URL)
client.connect();
client.query(`SELECT * FROM favorites`)
  .catch(() => client.query(`CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    petfinderid VARCHAR(255),
    type VARCHAR(255),
    name VARCHAR(255),
    age VARCHAR(255),
    gender VARCHAR(255),
    size VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    description TEXT,
    photo VARCHAR(255),
    url TEXT
  );`))
client.on('err', err => console.error(err));

// Application Setup
const app = express();
const PORT = process.env.PORT || 3001;

// Application Middleware
app.use(express.urlencoded({extended: true}));
app.use(express.static('./public'));

// Method overide
app.use(methodOverride((request, response) => {
  if (request.body && typeof request.body === 'object' && '_method' in request.body) {
    let method = request.body._method;
    delete request.body._method;
    return method;
  }
}));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');

// API Routes:

app.get('/', getToken, renderHomepage);
app.get('/search', getToken, renderSearchPage);
app.get('/details', renderDetailsPageFromFav);
app.get('/aboutUs', renderAboutUsPage);
app.post('/favorites', saveFavorite);
app.get('/favorites/:userName', renderSavedPets);
app.delete('/favorites', deleteFavorite);

// Helper Functions:

// https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript


function renderDetailsPageFromFav(request, response) {

  let SQL = `SELECT * FROM pets WHERE petfinderid = '${request.query.petfinderid}';`;
 
  console.log('params', request.query);
  return client.query(SQL)
    .then(results => {
      // console.log(results);
      response.render('pages/details', {petDetailsResponse: results.rows[0], userName:request.query.userName})
    })
    .catch(err => handleError(err, response));
}

function renderHomepage(request, response) {
  response.render('pages/index');
}

function addUserName (queryName) {


  const SQL = `
  INSERT INTO users (username) SELECT '${queryName}' 
  WHERE NOT EXISTS (SELECT * FROM users WHERE username = '${queryName}');
  `;

  return client.query(SQL)
    .catch(error => handleError(error, response));
}

function renderSearchPage(request, response, next) {

  let queryType = request.query.type;
  let queryZipCode = request.query.city;
  let queryDistance = request.query.travelDistance;
  let queryName = request.query.userName;
  let queryGoodWithChildren = request.query.goodWithChildren ? request.query.goodWithChildren : false ;
  let queryGoodWithDogs = request.query.goodWithDogs ? request.query.goodWithChildren : false ;
  let queryGoodWithCats = request.query.goodWithCats ? request.query.goodWithChildren : false ;
  let isInDataBase = [];

  


  let URL = `https://api.petfinder.com/v2/animals?type=${queryType}&location=${queryZipCode}&distance=${queryDistance}&good_with_children=${queryGoodWithChildren}&good_with_dogs=${queryGoodWithDogs}&good_with_cats=${queryGoodWithCats}&limit=100&sort=random&status=adoptable`

  console.log('!!!',URL)

  return superagent.get(URL)
    .set('Authorization', `Bearer ${request.token}`)
    .then(apiResponse => {
      const petInstances = apiResponse.body.animals.map(pet => new Pet (pet, queryName, isInDataBase))


      console.log(isInDataBase)
      response.render('pages/search', { petResultAPI: petInstances, userName: queryName, isInDataBase: isInDataBase})
      addUserName(queryName);
      next();

    })
    .catch(error => handleError(error));
}





function Pet(query, queryName, isInDataBase){
  this.type = query.type;
  this.petfinderid = query.id;
  this.name = query.name;
  this.age = query.age;
  this.gender = query.gender;
  this.size = query.size;
  this.city = query.contact.address.city;
  this.state = query.contact.address.state;
  this.description = query.description ? query.description.replace(/(& #39|& #39;|&#039;|&#39;)/gm, '\'').replace(/(&quot;|& quot;)/gm, '"').replace(/&amp;/gm, ' & ').replace(/#10;/gm, '').replace(/& quot/gm, '') : query.description;
  this.type = query.type;
  this.url = query.url;
  this.primaryBreed = query.breeds.primary;
  this.secondaryBreed = query.breeds.secondary;
  this.photos = [];
  this.inFavs = false;


  // console.log(query.photos.length)
  if(query.photos.length){
    // console.log('hey')
    for (let i = 0; i < query.photos.length; i++){
      // console.log(`hi, ${i}`)
      // console.log(query.photos[i].large)
      this.photos.push(query.photos[i].large);
      // this.photo[i] = query.photos[i].large;
    }
  }
  // console.log(this.photos);
  this.photo = query.photos.length ? query.photos[0].large : 'http://www.placecage.com/200/200';

  // check if the pet is already in favorited pets
  let SQL = `
          SELECT * FROM pets
          INNER JOIN favorite_pets
          ON petfinderid=pet_id
          INNER JOIN users
          ON users.id=username_id
          WHERE username = '${queryName}'
          AND pet_id = '${this.petfinderid}';
        `;
  client.query(SQL)
    .then(results => {
      if (results.rows[0]){
        this.inFavs = true;
        console.log('true')
      } else {
        this.inFavs = false;
      }
      isInDataBase.push(this.inFavs);
    })
    .catch(error => handleError(error));


}



function saveFavorite(request, response){

  let { petfinderid, userName, type, name, age, gender, size, city, state, description, photo, url } = request.body;


  const SQL = `
  INSERT INTO pets (petfinderid, type, name, age, gender, size, city, state, description, photo, url) SELECT '${petfinderid}','${type}','${name}', '${age}', '${gender}', '${size}','${city}', '${state}', '${description}', '${photo}', '${url}' 
  WHERE NOT EXISTS (SELECT * FROM favorites WHERE petfinderid = '${petfinderid}');

  INSERT INTO favorite_pets (pet_id, username_id) VALUES ('${petfinderid}',(SELECT id FROM users WHERE username='${userName}'));

  `;

  return client.query(SQL)
    .then(sqlResults => { //console.log('hello')
      response.redirect(`/search`)
    })
    .catch(error => handleError(error, response));
}

function renderSavedPets(request, response) {

  let userName = request.params.userName;

  let SQL = `
    SELECT * FROM pets
    INNER JOIN favorite_pets
    ON petfinderid=pet_id
    INNER JOIN users
    ON users.id=username_id
    WHERE username='${userName}';
  `;


  return client.query(SQL)
    .then(results => {
      response.render('pages/favorites', {renderFavorites: results.rows, userName: userName})
    })
    .catch(error => handleError(error, response));
}


function deleteFavorite(request, response) {

  let userName = request.body.userName;

  let petfinderid = request.body.petfinderid;
 
  let SQL = `DELETE FROM favorite_pets WHERE pet_id='${petfinderid}';
    SELECT * FROM pets
    INNER JOIN favorite_pets
    ON petfinderid=pet_id
    INNER JOIN users
    ON users.id=username_id
    WHERE username='${userName}';
  `;

  

  return client.query(SQL)
    .then(results => {
      response.render('pages/favorites', {renderFavorites: results[1].rows, userName: userName})
    })
    .catch(err => handleError(err, response));


}


function renderAboutUsPage(request, response) {
  response.render('pages/aboutUs');
}

// Error Handling Function
function handleError(error, response) {
  console.error(error);
  response.status(500).send('Sorry, something went wrong')
}

function getToken(request, response, next) {
  const URL = `https://api.petfinder.com/v2/oauth2/token?grant_type=client_credentials&client_id=${process.env.PET_FINDER_API_KEY}&client_secret=${process.env.PET_FINDER_SECRET}`
  superagent.post(URL)
    .send({'grant_type': 'client_credentials', 'client_id' : `${process.env.PET_FINDER_API_KEY}`, 'client_secret' : `${process.env.PET_FINDER_SECRET}`})
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .then(data => {
      // console.log(data)
      request.token = data.body.access_token
      next();
      return data
    })
    .catch(error => handleError(error));
}




// Button Event Handler

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
