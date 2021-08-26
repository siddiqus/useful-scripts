// Navigate to your desired linkedin-learning course page, where the video playlist is. Run this function through a code snippet in Chrome.
(async () => {
  const sleep = async (ms) => {
    return new Promise((res) => setTimeout(res, ms));
  }

  const fileUrls = [];
  const pageLinks = [...document.querySelectorAll('.classroom-toc-item a')].filter(page => {
    return !page.innerText.includes('Chapter Quiz');
  });

  for (const link of pageLinks) {
    link.click();
    await sleep(2000);
    const video = document.querySelector('.video-js video')
    if (video) {
      fileUrls.push(video.src);
    }
  }
  console.log(fileUrls);
})();

// in a nodejs file, run the following function with the course name and urls from the script above as parameters
function downloadAll(courseName, fileUrls) {
  const http = require('https'); // or 'https' for https:// URLs
  const fs = require('fs');
  const path = require('path');

   const download = async (url, dest) => {
    return new Promise((res, rej) => {
      const file = fs.createWriteStream(dest);
      http.get(url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
          file.close(() => res());  // close() is async, call cb after close completes.
        });
      }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        rej(err);
      });
    })
  };

  async function run(courseName, urls) {
    try {
      fs.mkdirSync(path.join(__dirname, 'linkedin-learning'));
    } catch (error) {
      console.log(`root dir already exist, probably`)
    }
    try {
      fs.mkdirSync(path.join(__dirname, 'linkedin-learning', courseName));
    } catch (error) {
      console.log(`course dir already exist, probably`)
    }

    let count = 1;
    for (const fileUrl of urls) {
      console.log(`Downloading file ${count} for course: ${courseName}`);
      try {
        await download(fileUrl, path.join(__dirname, 'linkedin-learning', courseName, `${count}.mp4`));
      } catch (error) {
        console.log(`file already exists, probably`)
      }
      count++;
    }
  }

  run(courseName, fileUrls)
    .then(() => {
      console.log('done');
      process.exit(0);
    })
    .catch(err => {
      console.log('error', err);
      process.exit(1);
    })
}
