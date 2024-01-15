function groupBy(collection, iteratee) {
    return collection.reduce((result,item)=>{
        const key = typeof iteratee === 'function' ? iteratee(item) : item[iteratee];

        if (!result[key]) {
            result[key] = [];
        }

        result[key].push(item);
        return result;
    }
    , {});
}

function getNamesFromHtml(htmlString) {
    const nameRegex = /<div[^>]*>([\s\S]*?)<\/div>/;
    const match = htmlString.match(nameRegex);
    const extractedName = match ? match[1].trim() : null;
    return extractedName ? extractedName.split(',').map((s)=>s.trim()) : null;
}

function getReviewersFromHtml(theIssue) {
    const reviewers = theIssue.extraFields.find((f)=>f.label === 'Code Reviewers');

    if (!reviewers) {
        return [];
    }

    return getNamesFromHtml(reviewers.html);
}

function getStatusNameFromId(statusMap, id) {
    return statusMap[id].statusName;
}

function getEpicNameFromId(epicMap, id) {
    if (!id) {
        return '';
    }
    return epicMap[id].epicField.text;
}

async function getFromUrl(apiUrl) {
    return new Promise((resolve,reject)=>{
        const xhr = new XMLHttpRequest();

        xhr.withCredentials = true;
        // Include credentials (cookies) in the request

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (error) {
                        reject(new Error('Error parsing JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP error! Status: ${xhr.status}`));
                }
            }
        }
        ;

        xhr.open('GET', apiUrl, true);
        xhr.send();
    }
    );
}

function getMappedIssueData(boardData) {
    const {epics, statuses} = boardData.entityData;

    const issues = boardData.issuesData.issues;

    // questions
    // how long has this in the current column? (in-progress, code review, product review)

    const mappedIssues = issues.map((issue)=>{
        const issueKey = issue.key;
        const assignee = issue.assigneeName;
        const epicName = getEpicNameFromId(epics, issue.epicId);

        const storyPoints = +issue.estimateStatistic.statFieldValue.value;

        const reviewers = getReviewersFromHtml(issue);

        const status = getStatusNameFromId(statuses, issue.statusId);
        const isDone = issue.done || status === 'Done';

        const timeElapsedInStatusInHours = Math.floor((Date.now() - issue.timeInColumn.enteredStatus) / 1000 / 60 / 60);

        return {
            issueKey,
            assignee,
            epicName,
            storyPoints,
            reviewers,
            isDone,
            status,
            timeElapsedInStatusInHours,
        };
    }
    );

    return mappedIssues;
}

const getBoardUrl = (baseUrl, projectKey,rapidViewId)=>`${baseUrl}/rest/greenhopper/1.0/xboard/work/allData.json?rapidViewId=${rapidViewId}&selectedProjectKey=${projectKey}`;

const TIME_ELAPSED_CLASS_NAME = 'ghx-issue-time-elapsed';

function getHtmlFromString(htmlString) {
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlString;
    return tempContainer
}

function getTimeElapsedHtmlElement(timeInHours) {
    let color;
    if (timeInHours < 24) {
        color = 'gray'
    } else if (timeInHours < 48) {
        color = 'coral'
    } else if (timeInHours < 72) {
        color = 'maroon'
    } else {
        color = 'red'
    }

    const htmlString = `<div class='${TIME_ELAPSED_CLASS_NAME} aui-label' style="border-radius: 2em; color:${color};float: right;margin-left: 10px;margin-right: auto;"><b color="red"><span class="aui-icon aui-icon-small aui-iconfont-time"></span> ${timeInHours}h</b></div>`;

    return getHtmlFromString(htmlString);
}

function getInProgressIssues(issueData) {
    return issueData.filter((f)=>!['To Do'].includes(f.status) && !f.isDone);
}

function highlightInProgressIssues(projectKey, issueData) {
    const cards = [...document.getElementsByClassName('ghx-issue')];

    const htmlCardMap = cards.reduce((obj,card)=>{
        if (card.getAttribute('id').includes(projectKey)) {
            const id = card.getAttribute('id');
            obj[id] = card;
        }
        return obj;
    }
    , {});

    for (const issue of issueData) {
        const htmlCard = htmlCardMap[issue.issueKey];

        const parentClass = 'ghx-card-footer';
        const endDivClass = 'ghx-days';

        const parentElem = htmlCard.querySelector(`.${parentClass}`);
        const endElem = htmlCard.querySelector(`.${endDivClass}`);

        const newHtmlElem = getTimeElapsedHtmlElement(issue.timeElapsedInStatusInHours);
        const existingElem = htmlCard.querySelector(`.${TIME_ELAPSED_CLASS_NAME}`)
        if (!existingElem) {
            parentElem.insertBefore(newHtmlElem, endElem);
        } else {
            existingElem.innerHTML = newHtmlElem.innerHTML
        }
    }
}

function getEpicCompletionData(issueData) {
    const epicMap = issueData.reduce((obj,issue)=>{
        const epicName = issue.epicName || 'N/A'
        if (obj[epicName]) {
            obj[epicName].push(issue)
        } else {
            obj[epicName] = [issue]
        }
        return obj
    }
    , {})

    const results = []
    for (const epicName of Object.keys(epicMap)) {
        const issues = epicMap[epicName] || []

        results.push({
            epicName,
            doneCount: issues.filter(f=>f.isDone).length,
            totalCount: issues.length
        })
    }

    return results;
}

function populateEpicCompletionData(epicCompletionData) {
    const htmlGenerator = (epic)=>{
        return `<span class="aui-label" style="padding: 5px; font-weight: 600; font-size: 12px"> ${epic.epicName} (${epic.doneCount}/${epic.totalCount}) </span>`
    }

    let htmlString = `<div id="ghx-header-epic-counts"> <span class="aui-label" style="padding: 5px; font-weight: 600; font-size: 12px">EPICS:</span> `

    epicCompletionData.sort((a,b)=>b.totalCount - a.totalCount)

    for (const epic of epicCompletionData) {
        const epicHtml = htmlGenerator(epic)
        htmlString += epicHtml
    }
    htmlString += '</div>'

    const htmlElem = getHtmlFromString(htmlString)

    const headerElem = document.querySelector('.ghx-controls-filters')

    const existingEpicHeaderElem = headerElem.querySelector('#ghx-header-epic-counts')
    if (!existingEpicHeaderElem) {
        headerElem.appendChild(htmlElem)
    } else {
        existingEpicHeaderElem.innerHTML = htmlElem.innerHTML
    }
}

function populateAssigneeData(assignedTasksData) {
    const dataArray = Object.keys(assignedTasksData).reduce((arr,d)=>{
        return [...arr, {
            name: d,
            count: assignedTasksData[d].length
        }]
    }
    , [])
    dataArray.sort((a,b)=>b.count - a.count)

    const htmlGenerator = (asigneeName,assigneeTasks)=>{
        return `<span class="aui-label" style="padding: 5px; font-weight: 600; color: gray; font-size: 12px"> ${asigneeName}: ${assigneeTasks} </span>`
    }

    const elementId = 'ghx-header-assignee-task-counts'
    let htmlString = `<div id="${elementId}"> <span class="aui-label" style="padding: 5px; font-weight: 600; font-size: 12px">ASSIGNED:</span>`

    for (const assignee of dataArray) {
        const epicHtml = htmlGenerator(assignee.name, assignee.count)
        htmlString += epicHtml
    }
    htmlString += '</div>'

    const htmlElem = getHtmlFromString(htmlString)

    const headerElem = document.querySelector('.ghx-controls-filters')

    const existingElem = headerElem.querySelector(`#${elementId}`)
    if (!existingElem) {
        headerElem.appendChild(htmlElem)
    } else {
        existingElem.innerHTML = htmlElem.innerHTML
    }
}

function getReviewerData(issueData) {
    const reviewersMap = {}

    for (const issue of issueData) {
        if (!issue.reviewers) {
            continue;
        }
        for (const reviewer of issue.reviewers) {
            if (reviewersMap[reviewer]) {
                reviewersMap[reviewer].push(issue)
            } else {
                reviewersMap[reviewer] = [issue]
            }
        }
    }

    return reviewersMap
}

function populateReviewerData(reviewerData) {
    const dataArray = Object.keys(reviewerData).reduce((arr,d)=>{
        return [...arr, {
            name: d,
            count: reviewerData[d].length
        }]
    }
    , [])

    dataArray.sort((a,b)=>b.count - a.count)

    const htmlGenerator = (asigneeName,assigneeTasks)=>{
        return `<span class="aui-label" style="padding: 5px; font-weight: 600; color: gray; font-size: 12px"> ${asigneeName}: ${assigneeTasks} </span>`
    }

    const elementId = 'ghx-header-reviewer-task-counts'
    let htmlString = `<div id="${elementId}"> <span class="aui-label" style="padding: 5px; font-weight: 600; font-size: 12px">REVIEWS:</span>`

    for (const reviewer of dataArray) {
        const epicHtml = htmlGenerator(reviewer.name, reviewer.count)
        htmlString += epicHtml
    }
    htmlString += '</div>'

    const htmlElem = getHtmlFromString(htmlString)

    const headerElem = document.querySelector('.ghx-controls-filters')

    const existingElem = headerElem.querySelector(`#${elementId}`)
    if (!existingElem) {
        headerElem.appendChild(htmlElem)
    } else {
        existingElem.innerHTML = htmlElem.innerHTML
    }
}

async function run() {
    const projectKey = 'STM';
    const rapidViewId = 1229;
    const baseUrl = 'https://jira.sso.episerver.net'
  
    const boardUrl = getBoardUrl(baseUrl, projectKey, rapidViewId);
    const boardData = await getFromUrl(boardUrl);
    const issueData = getMappedIssueData(boardData);
  
    const inProgressIssues = getInProgressIssues(issueData);
    highlightInProgressIssues(projectKey, inProgressIssues);

    const epicCompletionData = getEpicCompletionData(issueData);

    populateEpicCompletionData(epicCompletionData)

    populateAssigneeData(groupBy(issueData, 'assignee'))

    const reviewerData = getReviewerData(issueData)
    populateReviewerData(reviewerData)
}

(()=>{
    run();

    setInterval(()=>{
        run().then(()=>console.log('refreshed!'));
    }
    , 5000)
}
)()
