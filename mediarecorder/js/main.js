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

/* globals MediaRecorder */

// This code is adapted from
// https://rawgit.com/Miguelao/demos/master/mediarecorder.html

var mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
var mediaRecorder;
var sourceBuffer;

var bytesRecorded;

var gumVideo = document.querySelector('video#gum');
var recordedVideo = document.querySelector('video#recorded');

var recordButton = document.querySelector('button#record');
var playButton = document.querySelector('button#play');
var downloadButton = document.querySelector('button#download');
recordButton.onclick = toggleRecording;
playButton.onclick = play;
downloadButton.onclick = download;

// window.isSecureContext could be used for Chrome
var isSecureOrigin = location.protocol === 'https:' ||
location.host === 'localhost';
if (!isSecureOrigin) {
  alert('getUserMedia() must be run from a secure origin: HTTPS or localhost.' +
    '\n\nChanging protocol to HTTPS');
  location.protocol = 'HTTPS';
}

// Use old-style gUM to avoid requirement to enable the
// Enable experimental Web Platform features flag in Chrome 49

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var constraints = {
  audio: true,
  video: true
};

navigator.getUserMedia(constraints, successCallback, errorCallback);

function successCallback(stream) {
  console.log('getUserMedia() got stream: ', stream);
  window.stream = stream;
  if (window.URL) {
    gumVideo.src = window.URL.createObjectURL(stream);
  } else {
    gumVideo.src = stream;
  }
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
		console.log('Data available: ' + event.data.size + ' bytes');
	  storeVidBlob(event.data);
		bytesRecorded += event.data.size;
  }
}

function handleStop(event) {
  console.log('Recorder stopped: ', event);
}

function toggleRecording() {
  if (recordButton.textContent === 'Start Recording') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
    playButton.disabled = false;
    downloadButton.disabled = false;
  }
}

// The nested try blocks will be simplified when Chrome 47 moves to Stable
function startRecording() {
  bytesRecorded = 0;
	clearVidBlobs(startCB);
}

function startCB() {
  var options = {mimeType: 'video/webm', bitsPerSecond: 100000};

  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e0) {
    console.log('Unable to create MediaRecorder with options Object: ', e0);
  }

  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10); // collect 10ms of data
  console.log('MediaRecorder started', mediaRecorder);
}


function stopRecording() {
  mediaRecorder.stop();
  console.log('Total bytes recorded: ', bytesRecorded);
  recordedVideo.controls = true;
}

function play() {
	recallVidBlobs(playVidCB);
}

function playVidCB(recordedBlobs) {
	console.log( 'recordedBlobs size: ' + recordedBlobs.size );

  var superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
  recordedVideo.src = window.URL.createObjectURL(superBuffer);
}

function download() {
	recallVidBlobs(downloadVidCB);
}

function downloadVidCB(recordedBlobs) {
  var blob = new Blob(recordedBlobs, {type: 'video/webm'});
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

////   indexed DB stuff

var iDB = window.indexedDB || window.webkitIndexedDB ||
    window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;

var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction ||
    window.OIDBTransaction || window.msIDBTransaction;

var dbVersion = 1;
var db;

//// DB init
var request = iDB.open('Vidiot', dbVersion);

request.onerror = function(event) {
  console.log('Request error: ', event);
};

request.onsuccess = function(event) {
  console.log('DB open success: ', event);
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
  var objectStore = database.createObjectStore('current_vid', { 'autoIncrement': true });
}


//// DB writes

function getTransaction() {
  var transaction;
	try {
	  transaction = db.transaction(['current_vid'], "readwrite");
	  console.log('transaction: ', transaction);
	} catch (event1) {
	  console.log('Error creating transaction: ', event1);
	}
  return transaction;
}

function storeVidBlob(blob) {
	console.log("Putting blob in database");
	var transaction = getTransaction();
	var req = transaction.objectStore('current_vid').put( blob );
	req.onsuccess = function(evt) {
		console.log('Blob added');
	}
}

function clearVidBlobs(resultCB) {
	var transaction = getTransaction();
  var objectStore = transaction.objectStore('current_vid');

	objectStore.openCursor().onsuccess = function(evt) {
		var cursor = event.target.result;
		if (cursor) {
			cursor.delete();
			cursor.continue();
		} else {
      resultCB();
    }
	}
}

//// DB reads

function recallVidBlobs(resultCB) {
	var transaction = getTransaction();
	var objectStore = transaction.objectStore('current_vid');

	var blobList = [];

	objectStore.openCursor().onsuccess = function(evt) {
		var cursor = evt.target.result;
		if (cursor) {
			blobList.push(cursor.value);
			cursor.continue();
		} else {
			resultCB(blobList);
		}
	}
}
