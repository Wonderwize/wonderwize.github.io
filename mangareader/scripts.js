/**
 * CONFIGURATION AND CONSTANTS
 */
const storageKey = 'mangareader-config';

const defaultConfig = {
  smoothScroll: true,
  darkMode: true,
  seamless: true,
  double: false,
  filler: false,
};

const screenClamp = {
  none: 'none',
  shrink: 'shrink',
  fit: 'fit',
};

const orientation = {
  portrait: 'portrait',
  square: 'square',
  landscape: 'landscape',
};

const smartFit = {
  size0: {
    portrait: {
      width: 720,
      height: 1024,
    },
    landscape: {
      height: 800,
    },
  },
  size1: {
    portrait: {
      width: 1080,
      height: 1440,
    },
    landscape: {
      height: 1080,
    },
  },
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
 * UTILITY FUNTIONS
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

function asyncTimeout(millis) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), millis);
  });
}

/**
 * Returns a throttled version of a given input function, which will be executed at most once
 * every `millis` milliseconds. At the end of each period, the most recent invocation will be
 * executed. Execution also happens immediately if invoked while no throttle window is in
 * progress.
 * @param {(...args: any[]) => void} func Function to be throttled
 * @param {number} millis Throttle time in milliseconds
 */
function throttle(func, millis) {
  let active, lastArgs, count;
  return async (...args) => {
    if (!active) {
      active = true;
      lastArgs = args;
      func(...args);
      count = 0;
      while (true) {
        await asyncTimeout(millis);
        if (count) {
          count = 0;
          func(...lastArgs);
        } else {
          break;
        }
      }
      // eslint-disable-next-line require-atomic-updates
      active = false;
    } else {
      count++;
      lastArgs = args;
    }
  };
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
const smartFitBtns = Array.from(document.getElementsByClassName('btn-smart-fit'));
const smoothScrollCheckbox = document.getElementById('input-smooth-scroll');
const darkModeCheckbox = document.getElementById('input-dark-mode');
const seamlessCheckbox = document.getElementById('input-seamless');
const doubleCheckbox = document.getElementById('input-double');
const fillerCheckbox = document.getElementById('input-filler');
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

const imagesMeta = images.map((image) => {
  const ratio = image.naturalWidth / image.naturalHeight;
  return {
    image,
    orientation: ratio > 1 ? 'landscape' : 'portrait',
  };
});

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

function writeConfig(config) {
  const oldConfig = readConfig();
  const newConfig = Object.assign({}, oldConfig, config);
  try {
    localStorage.setItem(storageKey, JSON.stringify(newConfig));
  } catch (err) {
    console.error(err);
  }
}

function loadSettings() {
  const config = readConfig();
  setupZenscroll(config);
  setupDarkMode(config);
  setupSeamless(config);
  setupDouble(config);
  setupFiller(config);
}

function setupZenscroll(config) {
  window.zenscroll.setup(170);
  if (config.smoothScroll) {
    smoothScrollCheckbox.checked = true;
  } else {
    window.pauseZenscroll = true;
  }
}

function setupDarkMode(config) {
  darkModeCheckbox.checked = config.darkMode;
  // Setting `checked` does not fire the `change` event, so we must dispatch it manually
  if (config.darkMode) {
    toggleCheckbox(darkModeCheckbox);
  }
}

function setupSeamless(config) {
  seamlessCheckbox.checked = config.seamless;
  if (config.seamless) {
    toggleCheckbox(seamlessCheckbox);
  }
}

function setupDouble(config) {
  doubleCheckbox.checked = config.double;
  if (config.double) {
    toggleCheckbox(doubleCheckbox);
  }
}

function setupFiller(config) {
  fillerCheckbox.checked = config.filler;
  if (config.filler) {
    toggleCheckbox(fillerCheckbox);
  }
}

function getWidth() {
  return document.documentElement.clientWidth;
}

function getHeight() {
  return document.documentElement.clientHeight;
}

function handleOriginalSize() {
  setImagesWidth(screenClamp.none, getWidth());
}

function handleShrinkSize() {
  setImagesDimensions(screenClamp.shrink, getWidth(), getHeight());
}

function handleFitWidth() {
  setImagesWidth(screenClamp.fit, getWidth());
}

function handleFitHeight() {
  setImagesHeight(screenClamp.fit, getHeight());
}

function handleShrinkWidth() {
  setImagesWidth(screenClamp.shrink, getWidth());
}

function handleShrinkHeight() {
  setImagesHeight(screenClamp.shrink, getHeight());
}

function handleSmartWidth(event) {
  const key = event.target.dataset.fitKey;
  smartFitImages(smartFit[key]);
}

function setImagesWidth(fitMode, width) {
  for (const img of images) {
    switch (fitMode) {
      case screenClamp.fit:
        Object.assign(img.style, {
          width: `${width}px`,
          maxWidth: null,
          height: null,
          maxHeight: null,
        });
        break;
      case screenClamp.shrink:
        Object.assign(img.style, {
          width: null,
          maxWidth: `${width}px`,
          height: null,
          maxHeight: null,
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

function setImagesHeight(fitMode, height) {
  for (const img of images) {
    switch (fitMode) {
      case screenClamp.fit:
        Object.assign(img.style, {
          height: `${height}px`,
          maxWidth: null,
          width: null,
          maxHeight: null,
        });
        break;
      case screenClamp.shrink:
        Object.assign(img.style, {
          width: null,
          maxHeight: `${height}px`,
          height: null,
          maxWidth: null,
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

function setImagesDimensions(fitMode, width, height) {
  for (const img of images) {
    switch (fitMode) {
      case screenClamp.fit:
        // Not implemented
        break;
      case screenClamp.shrink:
        Object.assign(img.style, {
          width: null,
          maxHeight: `${height}px`,
          height: null,
          maxWidth: `${width}px`,
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

function smartFitImages(fitMode) {
  for (const { image: img, orientation: orient } of imagesMeta) {
    switch (orient) {
      case orientation.portrait:
        Object.assign(img.style, {
          width: null,
          maxWidth: null,
          height: null,
          maxHeight: `${fitMode.portrait.height}px`,
        });
        break;
      case orientation.landscape:
        Object.assign(img.style, {
          width: null,
          maxWidth: `${getWidth()}px`,
          height: null,
          maxHeight: `${fitMode.landscape.height}px`,
        });
        break;
    }
  }
  visiblePage.scrollIntoView({ behavior: 'smooth' });
}

function handleSmoothScroll(event) {
  window.pauseZenscroll = !event.target.checked;
  writeConfig({
    smoothScroll: event.target.checked,
  });
}

function handleDarkMode(event) {
  const darkModeEnabled = event.target.checked;
  if (darkModeEnabled) {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  writeConfig({
    darkMode: darkModeEnabled,
  });
}

function handleSeamless(event) {
  const seamlessEnabled = event.target.checked;
  if (seamlessEnabled) {
    document.body.classList.add('seamless');
  } else {
    document.body.classList.remove('seamless');
  }
  writeConfig({
    seamless: seamlessEnabled,
  });
  if (visiblePage) visiblePage.scrollIntoView();
}

function handleDouble(event) {
  const doubleEnabled = event.target.checked;
  const mp = document.getElementById("manga-pages");
  if (doubleEnabled) {
    mp.classList.add('double-page-view');
  } else {
    mp.classList.remove('double-page-view');
  }
  writeConfig({
    double: doubleEnabled,
  });
  if (visiblePage) visiblePage.scrollIntoView();
}

function handleFiller(event) {
  const fillerEnabled = event.target.checked;
  if (fillerEnabled) {
    let page = pageTemplate(-1, "");
    let mp = document.getElementById("manga-pages");
    mp.insertBefore(htmlToElement(page), mp.firstChild);
  } else {
    document.getElementById("_-1").remove();
  }
  writeConfig({
    filler: fillerEnabled,
  });
}

function setupListeners() {
  originalWidthBtn.addEventListener('click', handleOriginalSize);
  shrinkSizeBtn.addEventListener('click', handleShrinkSize);
  shrinkWidthBtn.addEventListener('click', handleShrinkWidth);
  shrinkHeightBtn.addEventListener('click', handleShrinkHeight);
  fitWidthBtn.addEventListener('click', handleFitWidth);
  fitHeightBtn.addEventListener('click', handleFitHeight);

  for (const button of smartFitBtns) {
    button.addEventListener('click', handleSmartWidth);
  }
  smoothScrollCheckbox.addEventListener('change', handleSmoothScroll);
  darkModeCheckbox.addEventListener('change', handleDarkMode);
  seamlessCheckbox.addEventListener('change', handleSeamless);
  doubleCheckbox.addEventListener('change', handleDouble);
  fillerCheckbox.addEventListener('change', handleFiller);

  window.onkeyup = function (e) { return keyPressed(e); };
}

function keyPressed(e) {
  var key = e.keyCode ? e.keyCode : e.which;

  switch (key) {
    case 68: //D
      toggleCheckbox(doubleCheckbox, true);
      break;
    case 70: //F
      toggleCheckbox(fillerCheckbox, true);
      break;
    default:
      console.log("Key event: " + key + " " + String.fromCharCode(key));
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

async function handleDrop(ev) {
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    if (ev.dataTransfer.items[0].kind === 'file') {
      var file = ev.dataTransfer.items[0].getAsFile();

      const module = await import(`./libarchive.js/main.js`);
      module.Archive.init({
        workerUrl: './libarchive.js/dist/worker-bundle.js'
      });

      const archive = await module.Archive.open(file);
      let i = 0;
      await archive.extractFiles((entry) => {
        if(entry.file.name.match(/.(jpg|jpeg|png|gif|bmp|svg|webp)$/i)) {
          let page = pageTemplate(i, URL.createObjectURL(entry.file));
          document.getElementById("manga-pages").appendChild(htmlToElement(page));
          i = i+1;
        }
      });

      //without this the last page isn't picked up, can you imagine?
      await new Promise(r => setTimeout(r, 50));
      document.querySelector("a[href='#_"+i+"']").href = "#_none";
      pages = Array.from(document.getElementsByClassName('page'));
      images = Array.from(document.getElementsByClassName('image'));
      document.getElementById("drop-zone").remove();
      main();
    }
  }
}

function main() {
  setupListeners();
  loadSettings();
  attachIntersectObservers();
  setupScrubber();
}
