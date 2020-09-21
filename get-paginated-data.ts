import Axios, { AxiosRequestConfig } from "axios";

type PaginatedUrlFunction = (page: number) => string;
type ResponseDataMapperFunction = (response: any) => any[]
type PaginationDataFromResponseFunction = (response: any) => {
  total: number
}

async function getPaginatedData({
  getPaginatedUrl,
  getObjectsFromResponseData,
  getPagination,
  limit,
  config,
  resourceName
}: {
  getPaginatedUrl: PaginatedUrlFunction
  getObjectsFromResponseData: ResponseDataMapperFunction
  getPagination: PaginationDataFromResponseFunction
  limit?: number
  config?: AxiosRequestConfig
  resourceName?: string
}) {
  const pageLimit = limit || 10
  const firstResponse = await Axios.get(getPaginatedUrl(1), {
    ...(config || {})
  });

  const data = firstResponse.data;
  let objects = getObjectsFromResponseData(data);
  if (!data || !objects) {
    throw new Error(resourceName ? `Could not fetch ${resourceName} data` : 'Could not fetch data');
  }

  const pagination = getPagination(data);
  if (pagination.total <= pageLimit) {
    return objects;
  }

  const numberOfPages = Math.ceil(pagination.total / pageLimit);

  const promises = [];
  for (let page = 2; page < numberOfPages + 1; page++) {
    promises.push(
      Axios.get(getPaginatedUrl(page), {
        ...(config || {})
      })
    );
  }

  return Promise.all(promises).then(responses => {
    responses.forEach(response => {
      const objs = getObjectsFromResponseData(response.data) as any[];
      if (!response.data || !objs) {
        throw new Error(resourceName ? `Could not fetch ${resourceName} data` : 'Could not fetch data');
      }
      objects = objects.concat(objs);
    });
    return objects;
  });
}
