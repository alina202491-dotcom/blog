
import vh from 'vh-plugin';
import { fmtDate } from '@/utils/index'
import { $GET } from '@/utils/index'
// 图片懒加载
import vhLzImgInit from "@/scripts/vhLazyImg";

const FriendsInit = async (data: any) => {
	const friendsDOM = document.querySelector('.main-inner-content>.vh-tools-main>main.friends-main')
	if (!friendsDOM) return;
	try {
		let res = data;
		if (typeof data === 'string') {
			// 仅请求 API，不再回退到静态 JSON
			res = await $GET(data);
		}
		if (!Array.isArray(res)) throw new Error('friends data invalid');
		// 统一按文章时间排序
		res.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
		// 渲染为时间线卡片：每条文章一个卡片，展示作者头像、标题、摘要、时间（不展示封面）
		friendsDOM.innerHTML = res.map((i: any) => {
			const domain = (i.site || i.link)?.split('//')[1]?.split('/')[0] || '';
			const avatar = `https://icon.bqb.cool/?url=${domain}`;
			const author = i.auther || i.name || domain;
			const site = i.site || i.link;
			return `
				<article class="friend-card">
					<header class="friend-head">
						<a href="${site}" target="_blank" rel="noopener nofollow">
							<img class="avatar" src="/assets/images/lazy-loading.webp" data-vh-lz-src="${avatar}" alt="${author}" />
							<h3 class="name">${author}</h3>
						</a>
					</header>
					<a href="${i.link}" target="_blank" rel="noopener nofollow" title="${i.title}">
						<div class="vh-ellipsis line-2 title">${i.title}</div>
					</a>
					<p class="vh-ellipsis line-3">${i.content || ''}</p>
					<footer>
						<time>${fmtDate(i.date, false)}前</time>
					</footer>
				</article>
			`;
		}).join('');
		// 图片懒加载
		vhLzImgInit();
	} catch {
		vh.Toast('获取数据失败')
	}
}

// 朋友圈 RSS 初始化
import FRIENDS_DATA from "@/page_data/Friends";
const { api, data } = FRIENDS_DATA;
export default () => FriendsInit(api || data);
