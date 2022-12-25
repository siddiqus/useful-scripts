const arr = Array(100_000_000);

async function run() {
  const counts = {
    forOf: [],
    forLoop: [],
    forEach: [],
    forLoopCached: [],
  };
  for (const _trial of Array(5)) {
    let count = 0;
    let startTime = Date.now();
    for (const _elem of arr) {
      count++;
    }
    let ms = Date.now() - startTime;
    counts.forOf.push(ms);

    startTime = Date.now();
    count = 0;
    arr.forEach((a) => {
      count++;
    });
    ms = Date.now() - startTime;
    counts.forEach.push(ms);

    startTime = Date.now();
    count = 0;
    for (let index = 0; index < arr.length; index++) {
      count++;
    }
    ms = Date.now() - startTime;
    counts.forLoop.push(ms);

    startTime = Date.now();
    count = 0;
    for (let index = 0, len = arr.length; index < len; index++) {
      count++;
    }
    ms = Date.now() - startTime;
    counts.forLoopCached.push(ms);
  }

  const averages = Object.keys(counts).reduce((obj, key) => {
    const loopCounts = counts[key];
    const avg =
      loopCounts.reduce((sum, elem) => sum + elem, 0) / loopCounts.length;
    obj[key] = avg;
    return obj;
  }, {});

  console.log(averages);
}

run()
  .then(() => {
    console.log('done');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
