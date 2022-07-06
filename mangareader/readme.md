# Mangareader

### [Try it](https://wonderwize.github.io/mangareader/)

https://user-images.githubusercontent.com/94489585/177158247-f2a8bc77-7720-425d-b883-da691cc50c1c.mp4

Standalone web app rework of [luejerry/html-mangareader](https://github.com/luejerry/html-mangareader) with many new features.
- Seamless double page view
- Japanese OCR
- Keyboard Shortcuts
- Toggle between RTL and LTR reading modes

For offline usage you might need to change your browser's CORS policies. (`privacy.file_unique_origin` in firefox)  
When the pages are misaligned in double page view, a filler page can be toggled to shift all pages by one and fix the alignment. 

## OCR

Draw a rectangle with your mouse to OCR a region of the page.  
You can use Yomichan's clipboard monitor or grab the text from the popup window.  

https://user-images.githubusercontent.com/94489585/177156342-a26d6a4e-a171-4f72-ad89-0066a981c906.mp4

OCR by [kha-white/manga-ocr](https://github.com/kha-white/manga-ocr) via this [API](https://hf.space/embed/gryan-galario/manga-ocr-demo/api).

## Keyboard Shortcuts

Key Code | Description
--- | ---
<kbd>O</kbd> | Page sizing: original size
<kbd>S</kbd> | Page sizing: shrink to fit
<kbd>W</kbd> | Page sizing: fit to width
<kbd>T</kbd> | Page sizing: fit to height
<kbd>R</kbd> | Toggle Right-to-left mode
<kbd>C</kbd> | Collapse spacing
<kbd>N</kbd> | Hide navigation
<kbd>M</kbd> | Toggle light/dark mode
<kbd>D</kbd> | Double page view
<kbd>F</kbd> | Toggle filler page
<kbd>P</kbd> | Toggle OCR popup autoclose
<kbd>Esc</kbd> | Cancel OCR region, close OCR window
<kbd>→</kbd>, <kbd>K</kbd>, <kbd>L</kbd> | Move to next page
<kbd>←</kbd>, <kbd>H</kbd>, <kbd>J</kbd> | Move to previous page

## Mouse Shortcuts

Click and hold to draw a rectangular area with your mouse to OCR the text within. Will not work offline.

# Libraries

- [libarchivejs](https://github.com/nika-begiashvili/libarchivejs)
- [html2canvas](https://github.com/niklasvh/html2canvas)
- [simple-notify](https://github.com/simple-notify/simple-notify)
