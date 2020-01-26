(() => {
    const searchTitles = ["sr.", "senior", "lead", "lead", "developer", "chief", "vice president",
            "full stack", "director", "architect", "manager", "product owner"];
    const searchKeywords = ["data engineer", "engineer", "fintech", "front end", "tech", "technical",
        "software", "technology", "technical", "aws", "microservice",
        "cloud", "big data", "backend", "frontend", "java", "javascript"];
    const ofCourse = ["cto", "chief technology"];
    const dontWant = ["quality", "business", "QA", "UX"]

    let intervalLoop;

    function scrollToBottom() {
        return new Promise((res, rej) => {
            let intervalCount = 0;
            let interval = setInterval(function() {
                window.scrollTo(0,document.body.scrollHeight);

                intervalCount++;

                if(intervalCount > 10) {
                   clearInterval(interval);
                   res();
                }
             }, 1000);
        })
    }

    async function sleep(time) {
        return new Promise((res) => {
            setTimeout(res, time)
        })
    }

    function handleLimitReached() {
        const isLimitReached = !!document.getElementById("ip-fuse-limit-alert__header");
        if(!isLimitReached) return null;

        clearInterval(intervalLoop);
        throw new Error("Reached connection limit");
    }

    function isMatch(infoText) {
        const isFilteredTitles = searchTitles.some(f => infoText.toLowerCase().includes(f));
        const isFilteredKeywords = searchKeywords.some(f => infoText.toLowerCase().includes(f));
        const isMust = ofCourse.some(f => infoText.toLowerCase().includes(f));
        const isDontWant = dontWant.some(f => infoText.toLowerCase().includes(f));

        if (isDontWant) return false;
        if (isMust) return true;

        return (isFilteredTitles && isFilteredKeywords);
    }

    async function connect () {
        let count = 0;

        const cards = document.querySelectorAll(".discover-entity-type-card");
        Array.prototype.forEach.call(cards, cardContainer => {
            const connectContainer = cardContainer.childNodes[9];

            if(cardContainer.childNodes[9] && cardContainer.childNodes[9].childNodes[8]) {
                const connectButton = cardContainer.childNodes[9].childNodes[8].childNodes[2];
                const card = cardContainer.childNodes[7];
                if(connectButton.textContent.includes("Connect")){
                    const name = card.childNodes[3].childNodes[4].textContent.trim();
                    const infoText = card.childNodes[3].childNodes[9].textContent.trim();

                    if(isMatch(infoText)){
                       connectButton.click();
                       handleLimitReached();
                       console.log("Person:", name, infoText);
                       count++;
                    }   
                }
            }
        });
        console.log(new Date(), "Connected: ", count);
    } 

    async function run () {
        document.getElementById("mynetwork-tab-icon").click();
        await sleep(1500);
        await scrollToBottom();
        await connect();
    }

    run();
    intervalLoop = setInterval(run, 20000);
    console.log("running")
})();
