/*
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

var iDB = window.indexedDB || window.webkitIndexedDB ||
    window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;

var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction ||
    window.OIDBTransaction || window.msIDBTransaction;

var dbVersion = 1;
var db;

var request = iDB.open('My songs', dbVersion);

request.onerror = function(event) {
  console.log('Request error: ', event);
};

request.onsuccess = function(event) {
  console.log('Open request success: ', event);
  db = request.result;
  db.onerror = function(error) {
    console.log('Database error:', error);
  };
};

request.onupgradeneeded = function(event) {
  createObjectStore(event.target.result);
};

function createObjectStore(database) {
  console.log('Creating objectStore');
  var objectStore = database.createObjectStore('songs', { 'autoIncrement': true });
	
	console.log('Creating indices');
  objectStore.createIndex('artist_idx', 'artist', { unique: false });
	objectStore.createIndex('song_idx', 'song', { unique: false });
}

function getTransaction() {
  var transaction;
	try {
	  transaction = db.transaction(['songs'], "readwrite");
	  console.log('transaction: ', transaction);
	} catch (event1) {
	  console.log('Error creating transaction: ', event1);
	}
  return transaction;
}

function storeRecord(event) {
	var artist = document.getElementById('artist').value;
	var song = document.getElementById('song').value;
	
	console.log("Putting song in database");
	var transaction = getTransaction();
	var req = transaction.objectStore('songs').put( {'artist': artist, 'song': song } );
	req.onsuccess = function(evt) {
		console.log('Artist ' + artist + ' added, yay');
	}
}

function findRecord(event) {
	var query = document.getElementById('query').value;
	
	var transaction = getTransaction();
	var objectStore = transaction.objectStore('songs');
	var index = objectStore.index("artist_idx");
	
	index.openCursor(query).onsuccess = function(evt) {
		var cursor = evt.target.result;
		if (cursor) {
			alert("Artist: " + cursor.value.artist + " Song: " + cursor.value.song );
			cursor.continue();
		} else {
			alert("No more entries found.");
		}
	}
}

var storeButton = document.getElementById('storeButton');
var findButton = document.getElementById('findButton');

storeButton.onclick = storeRecord;
findButton.onclick = findRecord;
