/**
 * CONFIGURATION AND CONSTANTS
 */
const storageKey = 'mangareader-config';

const defaultConfig = {
  rtl: true,
  seamless: true,
  hideNav: false,
  darkMode: true,
  double: false,
  filler: false,
};

const screenClamp = {
  none: 'none',
  shrink: 'shrink',
  fit: 'fit',
};

const pageTemplate = (id, imgsrc) => `
<div id="_${id}" class="page" data-index="${id}">
<a href="#_${id-1}">
  <span class="prev">
    <div class="arrow left">❮</div>
  </span>
</a>
<a href="#_${id+1}">
  <span class="next">
    <div class="arrow right">❯</div>
  </span>
</a>
<img src="${imgsrc}" class="image" />
</div>`;

/**
 * UTILITY FUNCTIONS
 */
function htmlToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function toggleCheckbox(chk, flip=false) {
  const change = document.createEvent('Event');
  change.initEvent('change', false, true);
  if (flip) chk.checked = !chk.checked;
  chk.dispatchEvent(change);
}

function onIntersectChange(targetIntersectHandler, intersectThreshold) {
  return new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.intersectionRatio > intersectThreshold)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        .map((entry) => entry.target)
        .forEach((target, index) => {
          if (!index) {
            targetIntersectHandler(target);
          }
        });
    },
    { threshold: [intersectThreshold] },
  );
}

/**
 * Creates a wrapper around `requestAnimationFrame` to enable a simpler task-based API for using
 * it. The wrapper object defines an `addTask` function that can be invoked to schedule a task to
 * run on the next animation frame. Description of `addTask` follows:
 *
 * Parameters
 * - label {string} an identifier for the task. If more than one tasks with the same label are
 *   scheduled in a single animation frame, only the most recently scheduled one will be executed.
 * - task {function} Callback function to execute on the next animation frame. The task will only
 *   run once, or not at all (if it is superceded by another task with the same label).
 */
function createAnimationDispatcher() {
  let tasks = {};
  const loop = () => {
    for (const [, task] of Object.entries(tasks)) {
      task();
    }
    tasks = {};
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return {
    addTask: (label, task) => {
      tasks[label] = task;
    },
  };
}

/**
 * GLOBAL VARIABLES
 */

let pages = Array.from(document.getElementsByClassName('page'));
let images = Array.from(document.getElementsByClassName('image'));
const originalWidthBtn = document.getElementById('btn-original-width');
const shrinkSizeBtn = document.getElementById('btn-shrink-size');
const shrinkWidthBtn = document.getElementById('btn-shrink-width');
const shrinkHeightBtn = document.getElementById('btn-shrink-height');
const fitWidthBtn = document.getElementById('btn-fit-width');
const fitHeightBtn = document.getElementById('btn-fit-height');

const rtlCheckbox = document.getElementById('input-rtl');
const seamlessCheckbox = document.getElementById('input-seamless');
const hideNavCheckbox = document.getElementById('input-hide-nav');
const darkModeCheckbox = document.getElementById('input-dark-mode');
const doubleCheckbox = document.getElementById('input-double');
const fillerCheckbox = document.getElementById('input-filler');

const dropZone = document.getElementById("drop-zone");
const mangaPages = document.getElementById("manga-pages");
const scrubberContainerDiv = document.getElementById('scrubber-container');
const scrubberDiv = document.getElementById('scrubber');
const scrubberPreviewDiv = document.getElementById('scrubber-preview');
const scrubberMarker = document.getElementById('scrubber-marker');
const scrubberMarkerActive = document.getElementById('scrubber-marker-active');
let scrubberImages; // Array of images, set in `setupScrubber()`

const animationDispatcher = createAnimationDispatcher();

let visiblePage;
// Used by scrubber
let screenHeight, scrubberPreviewHeight, markerHeight, visiblePageIndex;

const intersectObserver = onIntersectChange((target) => {
  visiblePage = target;
  visiblePageIndex = parseInt(target.dataset.index, 10);
  // Update the URL hash as user scrolls.
  const url = new URL(location.href);
  url.hash = target.id;
  history.replaceState(null, '', url.toString());

  setScrubberMarkerActive(visiblePageIndex);
}, 0.2);

function readConfig() {
  let config;
  try {
    // Unfortunately Edge does not allow localStorage access for file:// urls
    config = localStorage.getItem(storageKey);
  } catch (err) {
    console.error(err);
  }
  return config ? JSON.parse(config) : defaultConfig;
}

function writeConfig(key, val) {
  let newConfig = readConfig();
  newConfig[key] = val;
  try {
    localStorage.setItem(storageKey, JSON.stringify(newConfig));
  } catch (err) {
    console.error(err);
  }
}

function loadSettings() {
  const config = readConfig();
  setupCheckbox(rtlCheckbox, config.rtl);
  setupCheckbox(seamlessCheckbox, config.seamless);
  setupCheckbox(hideNavCheckbox, config.hideNav);
  setupCheckbox(darkModeCheckbox, config.darkMode);
  setupCheckbox(doubleCheckbox, config.double);
  setupCheckbox(fillerCheckbox, config.filler);
}

// Setting checked does not fire the change event, we must dispatch it manually
function setupCheckbox(chk, cfg) {
  chk.checked = cfg;
  if (cfg) toggleCheckbox(chk);
}

function getWidth() {
  return document.documentElement.clientWidth;
}

function getHeight() {
  return document.documentElement.clientHeight;
}

function handleOriginalSize() {
  setImageDimensions(screenClamp.none, getWidth());
}

function handleShrinkSize() {
  setImageDimensions(screenClamp.shrink, getWidth(), getHeight());
}

function handleFitWidth() {
  setImageDimensions(screenClamp.fit, getWidth());
}

function handleFitHeight() {
  setImageDimensions(screenClamp.fit, null, getHeight());
}

function handleShrinkWidth() {
  setImageDimensions(screenClamp.shrink, getWidth());
}

function handleShrinkHeight() {
  setImageDimensions(screenClamp.shrink, null, getHeight());
}

function setImageDimensions(fitMode, width=null, height=null) {
  for (const img of images) {
    switch (fitMode) {
      case screenClamp.fit:
        Object.assign(img.style, {
          width: width?`${width}px`:null,
          maxWidth: null,
          height: height?`${height}px`:null,
          maxHeight: null,
        });
        break;
      case screenClamp.shrink:
        Object.assign(img.style, {
          width: null,
          maxWidth: width?`${width}px`:null,
          height: null,
          maxHeight: height?`${height}px`:null,
        });
        break;
      default:
        Object.assign(img.style, {
          width: null,
          maxWidth: null,
          height: null,
          maxHeight: null,
        });
    }
  }
  visiblePage.scrollIntoView();
}

function handleCheckbox(event, funAdd, funRem, cfg, scrollIntoView = false) {
  const checked = event.target.checked;
  if(checked)
    funAdd();
  else
    funRem();
  writeConfig(cfg, checked);
  if(scrollIntoView && visiblePage) visiblePage.scrollIntoView();
}

function handleRtl(event) {
  handleCheckbox(
    event,
    () => mangaPages.classList.add('rtl'),
    () => mangaPages.classList.remove('rtl'),
    "rtl",
    true
  );
}

function handleSeamless(event) {
  handleCheckbox(
    event,
    () => document.body.classList.add('seamless'),
    () => document.body.classList.remove('seamless'),
    "seamless",
    true
  );
}

function handleHideNav(event) {
  handleCheckbox(
    event,
    () => document.body.classList.add('hide-nav'),
    () => document.body.classList.remove('hide-nav'),
    "hideNav"
  );
}

function handleDarkMode(event) {
  handleCheckbox(
    event,
    () => document.body.classList.add('dark'),
    () => document.body.classList.remove('dark'),
    "darkMode"
  );
}

function handleDouble(event) {
  handleCheckbox(
    event,
    () => mangaPages.classList.add('double-page-view'),
    () => mangaPages.classList.remove('double-page-view'),
    "double",
    true
  );
}

function handleFiller(event) {
  handleCheckbox(
    event,
    () => {
      let page = pageTemplate(-1, "");
      mangaPages.insertBefore(htmlToElement(page), mangaPages.firstChild);
    },
    () => document.getElementById("_-1").remove(),
    "filler"
  );
}

function setupListeners() {
  originalWidthBtn.addEventListener('click', handleOriginalSize);
  shrinkSizeBtn.addEventListener('click', handleShrinkSize);
  shrinkWidthBtn.addEventListener('click', handleShrinkWidth);
  shrinkHeightBtn.addEventListener('click', handleShrinkHeight);
  fitWidthBtn.addEventListener('click', handleFitWidth);
  fitHeightBtn.addEventListener('click', handleFitHeight);

  rtlCheckbox.addEventListener('change', handleRtl);
  seamlessCheckbox.addEventListener('change', handleSeamless);
  hideNavCheckbox.addEventListener('change', handleHideNav);
  darkModeCheckbox.addEventListener('change', handleDarkMode);
  doubleCheckbox.addEventListener('change', handleDouble);
  fillerCheckbox.addEventListener('change', handleFiller);

  window.onkeyup = function (e) { return keyPressed(e); };

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
  });
}

function nav(target) {
  target = Math.min(Math.max(target, 0), pages.length);
  document.getElementById("_"+target).scrollIntoView({behavior: 'smooth'});
  history.pushState(null, null, "#_"+target);
}

function ocr() {
  const target = images[parseInt(window.location.hash.substr(2))].src;

  Tesseract.recognize(
    target,
    'jpn',
    { logger: m => console.log(m) }
  ).then(({ data: { text } }) => {
    console.log(text);
  })
}

function keyPressed(e) {
  var key = e.keyCode ? e.keyCode : e.which;

  switch (key) {
    case 39: //right
    case 75: //K
    case 76: //L
      nav(parseInt(window.location.hash.substr(2))+
        ((rtlCheckbox.checked?-1:1)*
        (1+(doubleCheckbox.checked?1:0))));
      break;
    case 37: //left
    case 72: //H
    case 74: //J
      nav(parseInt(window.location.hash.substr(2))+
        ((rtlCheckbox.checked?-1:1)*
        (-1-(doubleCheckbox.checked?1:0))));
      break;
    case 67: //C
      toggleCheckbox(seamlessCheckbox, true);
      break;
    case 68: //D
      toggleCheckbox(doubleCheckbox, true);
      break;
    case 70: //F
      toggleCheckbox(fillerCheckbox, true);
      break;
    case 77: //M
      toggleCheckbox(darkModeCheckbox, true);
      break;
    case 78: //N
      toggleCheckbox(hideNavCheckbox, true);
      break;
    case 82: //R
      toggleCheckbox(rtlCheckbox, true);
      break;
    case 84: //T
      ocr();
      break
    case 79: //O
      handleOriginalSize();
      break;
    case 83: //S
      handleShrinkSize();
      break;
    case 87: //W
      handleFitWidth();
      break;
    default:
      //console.log("Key event: " + key + " " + String.fromCharCode(key));
  }
}

function setupScrubberPreview() {
  const previewImages = images.map((img) => {
    const previewImage = document.createElement('img');
    previewImage.src = img.src;
    previewImage.classList.add('scrubber-preview-image');
    return previewImage;
  });
  scrubberPreviewDiv.append(...previewImages);
  return previewImages;
}

function computeMarkerY(cursorY) {
  return Math.max(0, Math.min(cursorY - markerHeight / 2, screenHeight - markerHeight));
}

function setScrubberMarkerActive(activeIndex) {
  const activeY = ((activeIndex + 0.5) / images.length) * screenHeight - markerHeight / 2;
  scrubberMarkerActive.style.transform = `translateY(${activeY}px)`;
  scrubberMarkerActive.innerText = `${activeIndex + 1}`;
}

function setupScrubber() {
  let prevImage;

  const setPreviewScroll = (cursorY) => {
    const cursorYRatio = cursorY / screenHeight;
    scrubberPreviewDiv.style.transform = `translateY(${
      -cursorYRatio * scrubberPreviewHeight + cursorY
    }px)`;
  };

  const setMarkerPosition = (cursorY) => {
    const markerYPos = computeMarkerY(cursorY);
    scrubberMarker.style.transform = `translateY(${markerYPos}px)`;
  };

  const setMarkerText = (text) => {
    scrubberMarker.innerText = text;
  };

  let scrubberActivated = false;
  scrubberDiv.addEventListener('mouseenter', () => {
    if (!scrubberActivated) {
      scrubberImages = setupScrubberPreview();
      scrubberActivated = true;
    }
    screenHeight = document.documentElement.clientHeight;
    // We can't style this as 100vh because it doesn't account for horizontal scrollbar
    scrubberPreviewHeight = scrubberPreviewDiv.offsetHeight;
    markerHeight = scrubberMarker.offsetHeight;

    setScrubberMarkerActive(visiblePageIndex);
    scrubberDiv.style.height = `${screenHeight}px`;
    scrubberContainerDiv.style.opacity = '1';
  });

  scrubberDiv.addEventListener('mouseleave', () => {
    scrubberContainerDiv.style.opacity = '0';
  });

  scrubberDiv.addEventListener('mousemove', (event) => {
    const cursorY = event.clientY;
    const cursorYRatio = cursorY / screenHeight;
    const imageIndex = Math.floor(cursorYRatio * images.length);
    const image = scrubberImages[imageIndex];
    animationDispatcher.addTask('mousemove', () => {
      setMarkerPosition(cursorY);
      setMarkerText(`${imageIndex + 1}`);
      setPreviewScroll(cursorY);
      if (prevImage !== image) {
        image.classList.add('hovered');
        if (prevImage) {
          prevImage.classList.remove('hovered');
        }
        prevImage = image;
      }
    });
  });
  scrubberDiv.addEventListener('click', (event) => {
    const cursorYRatio = event.clientY / screenHeight;
    const imageIndex = Math.floor(cursorYRatio * images.length);
    images[imageIndex].scrollIntoView();
  });
}

function attachIntersectObservers() {
  for (const page of pages) {
    intersectObserver.observe(page);
  }
}

function allowDrop(ev){
  ev.preventDefault();
}

async function handleFile(ev) {
  ev.preventDefault();

  var file;
  if(ev.target.files)
    file = ev.target.files[0];
  else if (ev.dataTransfer.items) {
    if (ev.dataTransfer.items[0].kind === 'file')
      file = ev.dataTransfer.items[0].getAsFile();
  }

  if(file && file.name.match(/.(cbz|cbr|cb7|zip|rar|7z)$/i)) {
    dropZone.innerHTML = "Chotto a minute...";
    try {
      const module = await import(`./libarchive.js/main.js`);
      module.Archive.init({
        workerUrl: './libarchive.js/dist/worker-bundle.js'
      });

      const archive = await module.Archive.open(file);
      let hasEncryptedData = await archive.hasEncryptedData();
      if(hasEncryptedData) {
        var pw = prompt("Please enter the password for\r\n" + file.name);
        await archive.usePassword(pw);
      }

      await archive.extractFiles();
      let files = await archive.getFilesArray();
      //sort, since the archive might not be ordered correctly
      files.sort(
        (a,b) => (a.path + a.file.name).localeCompare(b.path + b.file.name, 'en', {numeric: true})
      );

      let i = 0;
      files.forEach((entry) => {
        if(entry.file.name.match(/.(jpg|jpeg|png|gif|bmp|svg|webp)$/i)) {
          let page = pageTemplate(i, URL.createObjectURL(entry.file));
          mangaPages.appendChild(htmlToElement(page));
          i = i + 1;
        }
      });

      document.querySelector("a[href='#_"+i+"']").href = "#_none";
      pages = Array.from(document.getElementsByClassName('page'));
      images = Array.from(document.getElementsByClassName('image'));
      dropZone.remove();
      main();
      document.title = file.name;
    } catch(ex) {
      dropZone.innerHTML = ex.name + ": " + ex.message + "<br/>" + ex.stack;
    }
  }
}

function main() {
  setupListeners();
  loadSettings();
  attachIntersectObservers();
  setupScrubber();
}

//clear hash on page refresh
history.pushState("", document.title, window.location.pathname + window.location.search);