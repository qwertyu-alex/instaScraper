const puppeteer = require('puppeteer');
const fs = require('fs');
const $ = require('cheerio');
const download = require('image-downloader');

const instaUrl = "https://www.instagram.com/" + process.argv[2];


(async () => {

    console.log("Waiting for page to load");
    new Promise(done => setTimeout(done, 5000));

    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.goto(instaUrl);
    await page.setViewport({
        width: 1000,
        height: 800
    });

    await new Promise((resolve, reject) => {

      let imgUrls = [];
      let secondTry = false;
      let thirdTry = false;


      let timer = setInterval(()=>{
        page.content().then(html => {
          let foundImages = $('.v1Nh3 a img', html);

          singleScroll(page).then(scrolled => {

            for (var i = 0; i < foundImages.length; i++) {

              let same = false;

              if (imgUrls.length != 0) {
                for (var j = 0; j < imgUrls.length; j++) {
                  if (imgUrls[j] == foundImages[i].attribs.src) {
                    same = true;
                    break;
                  }
                }
              }

              if (!same) {
                imgUrls.push(foundImages[i].attribs.src);
              }
            }

            //Hvis den ikke kan scrolle mere skal den gå ud af timeren
            if (!scrolled) {
              if (secondTry) {
                if (thirdTry) {
                  clearInterval(timer);
                  resolve(imgUrls);

                } else {
                  thirdTry = true;
                  new Promise(done => setTimeout(done, 5000));
                }
              } else {
                secondTry = true;
              }
            } else {
              secondTry = false;
              thirdTry = false;
            }


          });
        })
      }, 200);
    }).then(imgUrls => {
      downloadImages(imgUrls, process.argv[2])
    })

    await page.content().then(value => {
      writeHtml(value);
    }).then(value => {
      setTimeout(function() {}, 500);
      browser.close()
    })
})();

async function singleScroll(page){
  let boolean = true;

  let res = await page.evaluate(async () => {
      let result = new Promise((resolve, reject) => {
          var distance = 450;

          var pastHeight = document.documentElement.scrollTop;
          window.scrollBy(0, distance);
          var currentHeight = document.documentElement.scrollTop;

          if (pastHeight >= currentHeight) {
            resolve([0,pastHeight,currentHeight])
          } else {
            resolve([1,pastHeight,currentHeight])
          }
      })
      return Promise.resolve(result);
  });
  return !!(res[0]);
}

let writeHtml = function (html) {
  let dir = "./webpages"
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }

  fs.writeFile("./webpages/data.html", html, function (err) {
    if (err) {
      throw err
    }
    console.log("HTML-file has been written");
  });
}

let downloadImages = function (imgUrls, username) {
  let counter = 1;

  let dir = "./images"
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }

  imgUrls.forEach(element => {
    let options = {
      url: element,
      dest:'./images/' + username + counter++ + '.jpg'
    }

    download.image(options)
      .then(({filename, image}) => {
        console.log('Saved image to: ' + filename);
      })
      .catch(err => {
        throw err;
      })
  })
}
