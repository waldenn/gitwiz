import QueryController from './query.controller';

interface QueryData {
    rateLimit?: RateLimit,
    message?: string,
    data?: {
        search: {
            edges: Array<DataEdge>
        }
    }
};

interface RateLimit {
    cost: number,
    remaining: number,
    resetAt: string
};

interface DataEdge {
    node: {
        name: string,
        nameWithOwner: string,
        url: string,
        homepageUrl: string,
        description: string | null,
        parent?: {
            nameWithOwner: string
        } | null,
        languages: {
            nodes: Array<{
                name: string
            }>
        },
        releases: {
            nodes: Array<{
                tagName: string
            }>
        },
        forkCount: number,
        stargazers: {
            totalCount: number
        },
        diskUsage: number,
        createdAt: string,
        repositoryTopics: {
            nodes: Array<{
                topic: {
                    name: string
                }
            }>
        }
    }   
};

export default class GithubController {
    private url: string;
    private query: string;
    private token: string;

    private queryController: QueryController;

    constructor(query: string, token: string) {
        this.url = "https://api.github.com/graphql";
        this.query = query;
        this.token = token;
        this.queryController = new QueryController(this.url, this.token);
    }

    makeQuery(): Promise<Array<DataEdge>>{ 
        return new Promise((resolve, reject) => {
            this.queryController.fetchData(`query { rateLimit { cost remaining resetAt } search(query: \"${this.query}\", type: REPOSITORY, first: 100) { repositoryCount edges { node { ... on Repository { name nameWithOwner url homepageUrl description parent { nameWithOwner } languages(first:5) { nodes { name } } releases(last:1) { nodes { tagName } } forkCount stargazers { totalCount } diskUsage createdAt repositoryTopics(first:10) { nodes { topic { name } } } } } } } }`)
            .then((response: QueryData) => {
                if(response.rateLimit?.remaining === 0) {
                    throw new Error("GithubControllerError/makeQuery(): Github rate limit exceeded");
                }
                if(response.data?.search.edges) {
                    if(response.data?.search.edges.length === 0) {
                        throw new Error("GithubControllerError/makeQuery(): Query returned 0 results");    
                    } else {
                        resolve(response.data?.search.edges);
                    }
                } else {
                    throw new Error("GithubControllerError/makeQuery(): GitHub Error");
                }
            })
            .catch((error: string) => {
                reject(error);
            });
        });     
    }

    processData(): Promise<Array<object>> {
        let processedData: Array<object> = [];
        return new Promise(async (resolve, reject) => {
            this.makeQuery().then((response: Array<DataEdge>) => {
                if(response !== undefined) {
                    response.forEach((edge: DataEdge) => {
                        if(!edge.node.parent?.nameWithOwner) {
                            let repoTopicTags: string = "", langTags: string = "";
                            if(edge.node.repositoryTopics.nodes.length > 0) {
                                for(const repoTopic of edge.node.repositoryTopics.nodes) {
                                    repoTopicTags += `<button class="res-tag res-data-tag">${repoTopic.topic.name}</button>`;
                                }
                            }
                            if(edge.node.languages.nodes.length > 0) {
                                for(const lang of edge.node.languages.nodes) {
                                    langTags += `<button class="res-tag res-data-tag">${lang.name.toUpperCase()}</button>`;
                                }
                            } 
                            processedData.push({
                                platform: "github",
                                htmlString: 
                                `<div class="res">
                                    <button class="res-el res-tag res-pf-tag res-gh-tag">GitHub</button>
                                    <a class="res-link" href="${edge.node.url}">
                                        <p class="res-el res-title">${edge.node.name}</p>
                                        <p class="res-el res-sub">https://www.github.com > ${edge.node.nameWithOwner}</p>
                                    </a>
                                    ${edge.node.description !== null ? edge.node.description.length > 0 ? `<p class="res-el res-desc">${edge.node.description}</p>` : "" : ""}
                                    <div class="res-data-tag-container">
                                        ${langTags}
                                        ${edge.node.releases.nodes.length > 0 ? `<button class="res-tag res-data-tag"><svg class="octicon octicon-release"xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 16" style="display: inline-block; fill: currentcolor; user-select: none; vertical-align: text-bottom;"><path fill-rule="evenodd" d="M7.73 1.73C7.26 1.26 6.62 1 5.96 1H3.5C2.13 1 1 2.13 1 3.5v2.47c0 .66.27 1.3.73 1.77l6.06 6.06c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 000-1.41L7.73 1.73zM2.38 7.09c-.31-.3-.47-.7-.47-1.13V3.5c0-.88.72-1.59 1.59-1.59h2.47c.42 0 .83.16 1.13.47l6.14 6.13-4.73 4.73-6.13-6.15zM3.01 3h2v2H3V3h.01z"></path></svg> ${edge.node.releases.nodes[0].tagName}</button>` : ""}
                                        <button class="res-tag res-data-tag"><svg aria-hidden="true" class="octicon octicon-star" role="img" viewBox="0 0 14 16" style="display: inline-block; fill: currentcolor; user-select: none; vertical-align: text-bottom;"><path fill-rule="evenodd" d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z"></path></svg> ${edge.node.stargazers.totalCount}</button>
                                        <button class="res-tag res-data-tag"><svg class="octicon octicon-star" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 16" style="display: inline-block; fill: currentcolor; user-select: none; vertical-align: text-bottom;"><path fill-rule="evenodd" d="M8 1a1.993 1.993 0 00-1 3.72V6L5 8 3 6V4.72A1.993 1.993 0 002 1a1.993 1.993 0 00-1 3.72V6.5l3 3v1.78A1.993 1.993 0 005 15a1.993 1.993 0 001-3.72V9.5l3-3V4.72A1.993 1.993 0 008 1zM2 4.2C1.34 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3 10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm3-10c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"></path></svg> ${edge.node.forkCount}</button>
                                        <button class="res-tag res-data-tag">${edge.node.diskUsage} KB</button>
                                        ${repoTopicTags}
                                    </div>
                                </div>`
                            });
                        }
                    });
                    resolve(processedData);
                } else {
                    reject("GithubControllerError/processData(): makeQuery() response was undefined");
                }
            }).catch(error => { 
                console.log(error.message);
                resolve([]);
            });
        }); 
    }
}