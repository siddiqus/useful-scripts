/* eslint-disable @typescript-eslint/no-unused-vars */
const sizes = [1000, 100000, 1000000, 10000000, 100000000];

async function run() {
  let count = 0;

  const counts: {
    forOf: {
      [key in number]: number;
    };
    forLoop: {
      [key in number]: number;
    };
    forEach: {
      [key in number]: number;
    };
    forLoopCached: {
      [key in number]: number;
    };
  } = {
    forOf: {},
    forEach: {},
    forLoopCached: {},
    forLoop: {},
  };

  const trialCount = 10;

  for (const size of sizes) {
    const arr = Array(size);
    counts.forOf[size] = 0;
    counts.forEach[size] = 0;
    counts.forLoop[size] = 0;
    counts.forLoopCached[size] = 0;

    for (const _trial of Array(trialCount)) {
      let startTime = Date.now();
      for (const _elem of arr) {
        count++;
      }
      let ms = Date.now() - startTime;
      counts.forOf[size] += ms;

      startTime = Date.now();
      count = 0;
      arr.forEach((a) => {
        count++;
      });
      ms = Date.now() - startTime;
      counts.forEach[size] += ms;

      startTime = Date.now();
      count = 0;
      for (let index = 0; index < arr.length; index++) {
        count++;
      }
      ms = Date.now() - startTime;
      counts.forLoop[size] += ms;

      startTime = Date.now();
      count = 0;
      for (let index = 0, len = arr.length; index < len; index++) {
        count++;
      }
      ms = Date.now() - startTime;
      counts.forLoopCached[size] += ms;
    }

    Object.keys(counts).forEach((loopType) => {
      counts[loopType as any as keyof typeof counts][size] =
        counts[loopType as any as keyof typeof counts][size] / trialCount; // calc avg
    });
  }

  console.table(counts);

  return count;
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
