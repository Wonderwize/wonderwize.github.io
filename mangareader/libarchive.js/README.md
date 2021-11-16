# Libarchivejs

<p align="left">
  <a href="https://www.npmjs.com/package/libarchive.js">
    <img src="https://img.shields.io/npm/v/libarchive.js.svg"
         alt="npm version">
  </a>
  <a href="https://travis-ci.com/nika-begiashvili/libarchivejs">
    <img src="https://travis-ci.com/nika-begiashvili/libarchivejs.svg?branch=master"
         alt="build status">
  </a>
  <a href="https://david-dm.org/nika-begiashvili/libarchivejs">
    <img src="https://david-dm.org/nika-begiashvili/libarchivejs/status.svg"
         alt="dependency status">
  </a>
  <a href="https://github.com/nika-begiashvili/libarchivejs/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/libarchive.js.svg"
         alt="license">
  </a>
</p>

## Overview

Libarchivejs is a archive tool for browser which can extract various types of compression, it's port of [libarchive](https://github.com/libarchive/libarchive) to WebAssembly and javascript wrapper to make it easier to use, since it runs on WebAssembly performance should be near native. supported formats: **ZIP**, **7-Zip**, **RAR v4**, **RAR v5**, **TAR**. supported compression: **GZIP**, **DEFLATE**, **BZIP2**, **LZMA**

## How to use

Install with `npm i libarchive.js` and use it as ES module.
library consists of two parts: ES module and webworker bundle, ES module part is your interface to talk to library, use it like any other module, webworker bundle lives in `libarchive.js/dist` folder so you need to make sure that it is available in your public folder since it will not get bundled if you're using bundler (it's all bundled up already) and specify correct path to `Archive.init()` method 

```js
import {Archive} from 'libarchive.js/main.js';

Archive.init({
    workerUrl: 'libarchive.js/dist/worker-bundle.js'
});

document.getElementById('file').addEventListener('change', async (e) => {
    const file = e.currentTarget.files[0];

    const archive = await Archive.open(file);
    let obj = await archive.extractFiles();
    
    console.log(obj);
});

// outputs
{
    ".gitignore": {File},
    "addon": {
        "addon.py": {File},
        "addon.xml": {File}
    },
    "README.md": {File}
}

```

### More options

To get file listing without actually decompressing archive, use one of these methods
```js
    await archive.getFilesObject();
    // outputs
    {
        ".gitignore": {CompressedFile},
        "addon": {
            "addon.py": {CompressedFile},
            "addon.xml": {CompressedFile}
        },
        "README.md": {CompressedFile}
    }

    await archive.getFilesArray();
    // outputs
    [
        {file: {CompressedFile}, path: ""},
        {file: {CompressedFile},   path: "addon/"},
        {file: {CompressedFile},  path: "addon/"},
        {file: {CompressedFile},  path: ""}
    ]
```
if this methods get called after `archive.extractFiles();` they will contain actual files as well

decompression might take long for bigger files, to track each file as it gets extracted `archive.extractFiles` accepts callback
```js
    archive.extractFiles((entry) => { // { file: {File}, path: {String} }
        console.log(entry);
    });
```

### Extract single file form archive

To extract single file from archive you can use `extract()` method on returned `CompressedFile`

```js
    const filesObj = await archive.getFilesObject();
    const file = await filesObj['.gitignore'].extract();
```

### Check for encrypted data

```js
    const archive = await Archive.open(file);
    await archive.hasEncryptedData();
    // true - yes
    // false - no
    // null - can not be determined
```

### Extract encrypted archive

```js
    const archive = await Archive.open(file);
    await archive.usePassword("password");
    let obj = await archive.extractFiles();
```

## How it works

Libarchivejs is port of popular [libarchive](https://github.com/libarchive/libarchive) C library to WASM. since WASM runs in current thread library uses WebWorkers for heavy lifting, ES Module (Archive class) is just a client for WebWorker, it's tiny and doesn't take up much space.
only when you actually open archive file web worker will be spawn and WASM module will be downloaded, each `Archive.open` call corresponds to each WebWorker.
after calling `extractFiles` worker will be terminated to free up memory, client will still work with cached data
