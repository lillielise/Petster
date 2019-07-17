'use strict';

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const methodOverride = require('method-override');

// Environment variables
require('dotenv').config();

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
app.get('/details/:id', renderDetailsPageFromFav);
app.get('/aboutUs', renderAboutUsPage);
app.post('/favorites', saveFavorite);
app.get('/favorites', renderSavedPets);
app.delete('/favorites/:id', deleteFavorite);

// Helper Functions:

function renderDetailsPageFromFav(request, response) {
  let SQL = 'SELECT * FROM favorites WHERE id=$1;';
  let values = [request.params.id];
  // console.log('rendering details', values[0]);
  return client.query(SQL, values)
    .then(results => {
      // console.log(results);
      response.render('pages/details', {petDetailsResponse: results.rows[0]})
    })
    .catch(err => handleError(err, response));
}

function renderHomepage(request, response) {
  response.render('pages/index');
}

function addUserName (queryName) {

  const SQL = `
  INSERT INTO users (username) SELECT '${queryName}' 
  WHERE NOT EXISTS (SELECT * FROM users WHERE username = '${queryName}')
  RETURNING id;
  `;

  return client.query(SQL)
    .catch(error => handleError(error, response));
}

function renderSearchPage(request, response) {

  let queryType = request.query.type;
  let queryZipCode = request.query.city;
  let queryDistance = request.query.travelDistance;
  let queryName = request.query.firstName;


  let URL = `https://api.petfinder.com/v2/animals?type=${queryType}&location=${queryZipCode}&distance=${queryDistance}&limit=100&sort=random&status=adoptable`



  return superagent.get(URL)
    .set('Authorization', `Bearer ${request.token}`)
    .then(apiResponse => {
      // console.log(apiResponse.body.animals)
      const petInstances = apiResponse.body.animals
      
        // .filter(petData => {
        //   if (petData.name.includes('adopted') || petData.name.includes('adoption')){
        //     return false;
        //   } else {
        //     return true;
        //   }
        // })
        .map(pet => new Pet (pet))
      response.render('pages/search', { petResultAPI: petInstances })
      addUserName(queryName);
    })
    .catch(error => handleError(error));
}




function Pet(query){

  this.type = query.type;
  this.petfinderid = query.id;
  // console.log('THIS IS THE PETFINDER ID',this.petfinderid)
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
}

function saveFavorite(request, response){


  let { petfinderid, type, name, age, gender, size, city, state, description, photo, url } = request.body;
  console.log('Petfinder ID!', petfinderid);

  const SQL = `
  INSERT INTO favorites (petfinderid, type, name, age, gender, size, city, state, description, photo, url) SELECT '${petfinderid}','${type}','${name}', '${age}', '${gender}', '${size}','${city}', '${state}', '${description}', '${photo}', '${url}' 
  WHERE NOT EXISTS (SELECT * FROM favorites WHERE petfinderid = '${petfinderid}')
  RETURNING id;
  `;

  return client.query(SQL)
    .then(sqlResults => { //console.log('hello')
      response.redirect(`/search`)
    })
    .catch(error => handleError(error, response));
}

function renderSavedPets(request, response) {
  let SQL = `SELECT * FROM pets`;

  return client.query(SQL)
    .then(results => {
      response.render('pages/favorites', {renderFavorites: results.rows})
      // response.render('pages/favorites', {results: results.rows})
    })
    .catch(error => handleError(error, response));
}

function deleteFavorite(request, response) {
  let SQL = 'DELETE FROM favorites WHERE id=$1;';
  let values = [request.params.id];

  return client.query(SQL, values)
    .then(() => response.redirect('/favorites'))
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
