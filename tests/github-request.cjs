'use strict';
// 인증 헤더는 GitHub API에만 보내며 리다이렉트로 전달하지 않습니다.
async function githubGet(request, url) {
  if (new URL(url).origin !== 'https://api.github.com') throw new Error('GitHub API URL이 아닙니다.');
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return request.get(url, { headers, maxRedirects: 0 });
}
module.exports = { githubGet };
