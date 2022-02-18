# WacLine
> Please note that this is a prototype under development. It is not thought to use in a production environment yet.

WacLine is a Software Product Line to manage heterogeneity in Web Annotation domain. Specifically, WacLine allows configuration and automatically generation of customized web annotation clients to conduct annotation activities in specific domains.
Created annotation clients are [browser extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) currently compatible with Chromium-like web browsers (Google Chrome, Opera,...).

# Requirements for contributors and annotation clients developers
* Pure::variants v5.0: Our SPL is build on top of [pure::variants](https://www.pure-systems.com/). Pure::variants is an eclipse plugin for development and deployment of products lines and software families.
  * [Evaluation Software](https://www.pure-systems.com/support/purevariants-download) to develop it. 
* NodeJS v16: required to compile the resultant generated products. We recommend you to use nvm for [UNIX-like systems](https://github.com/nvm-sh/nvm) or for [windows](https://github.com/coreybutler/nvm-windows) to manage multiple versions of nodeJS installed in your system.
* [Gulp](https://gulpjs.com/) v4: a javascript toolkit to manage build tasks over nodeJS. To install it globally run:
`npm install -g gulp`
* For MacOSX it is required to have installed and updated [Xcode](https://developer.apple.com/xcode/)
* Additional packages to develop:
  * eslint: `npm install eslint -g`

# How to create your annotation client
> You can follow [this small video](https://go.haritzmedina.com/waclineVideo) that creates a sample extension 

Step 1. You can create a product variant in ./Variants/ folder in Eclipse. Configure with the features that your annotation client must have to conduct your annotation activity. You can view the full documentation of the feature model [here](https://onekin.github.io/WacLine/featureModel/).

Step 2. Generate the product, the resultant will be placed in ./output/<name_of_your_product>

Step 3. Resolve dependencies and compile:
* In windows systems: Open a powershell and execute in `./output/<name_of_your_product>` folder:
`./dependencies.ps1`
* In UNIX-like systems: Open a shell and execute in `./output/<name_of_your_product>` folder:
`./dependencies.sh`

Step 4. A compiled browser extension is created in `./output/<name_of_your_product>/dist` folder. Drag and drop to your browser's [extensions folder](chrome://extensions/) (remember that Developer mode must be activated)

Step 5. Test the installed extension in the browser

# Examples
Community have created up to 6 variants that can be used as an example, where three of them are already available in Chrome Store:
* [Highlight&Go](https://chrome.google.com/webstore/detail/highlightgo/bihmalipgnlomidlpekdnoohiejppfmo): a web annotation client to conduct Systematic Literature Reviews data extraction using Google Sheets
* [Mark&Go](https://chrome.google.com/webstore/detail/markgo/kjedcndgienemldgjpjjnhjdhfoaocfa): a web annotation client to conduct assignments marking over Moodle using evaluation rubrics
* [Review&Go](https://chrome.google.com/webstore/detail/reviewgo/hgiannlbfceoomjmcgedbmkfeblbcogi?hl=en): a web annotation client to conduct papers review based on a customizable reviewing framework
* ConceptAndGo: a web annotation client to develop mind maps based on capturing data over the web
* Docal: a web annotation client to capture data from legal sentences
* Fival: a web annotation client for bachelor degree thesis evaluation

You can find the latest version of each of them in their corresponding branch `product/*` (e.g., for Highlight&Go the branch is named `product/highlightAndGo`).

# How to contribute
You can check contribution information in [contributing notes](CONTRIBUTING.md).

# Continuous delivery for application engineers and contributors
Each of the derived products from WacLine are ready to build, ~~test~~ and pack to delivery in browser extensions stores (e.g: Chrome Web Store).
Here are described some gulp tasks to facilitate these activities:

## Build
> Note that ./dependencies.sh or ./dependencies.ps1 described above builts the browser extension to install as a developer in chrome. The following section describes other available options for building.

    $ gulp

| Option         | Description                                                                                                                                           |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--watch`      | Starts a livereload server and watches all assets. <br>To reload the extension on change include `livereload.js` in your bundle.                      |
| `--production` | Minifies all assets                                                                                                                                   |
| `--verbose`    | Log additional data to the console.                                                                                                                   |
| `--vendor`     | Compile the extension for different vendors (chrome, firefox, opera, edge)  Default: chrome                                                                 |
| `--sourcemaps` | Force the creation of sourcemaps. Default: !production                                                                                                |

### Pack

Zips your `dist` directory and saves it in the `packages` directory.

    $ gulp pack --vendor=firefox
 
## Testing

We are currently planning to automatize web annotation clients testing using puppeteer.
