import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const ImgCardTemp = ({ cardData = [] }) => {
  // 默认卡片数据，用于演示
  const defaultCards = [
    {
      nub: 1,
      name: 'AI辩论赛',
      img: 'https://cdn.jsdmirror.com/cnb/wget/img/-/git/raw/main/ai/aibattle.png',
      describe: '智能AI辩论对战平台',
      tag: '小游戏',
      link: '',
      path: ''
    },
    {
      nub: 2,
      name: '任务分解器',
      img: 'https://cdn.jsdmirror.com/cnb/wget/img/-/git/raw/main/ai/jobplain.png',
      describe: '智能任务分解与管理工具',
      tag: '工具',
      link: '',
      path: ''
    }
  ];

  // 使用传入的数据或默认数据
  const cardsToDisplay = cardData.length > 0 ? cardData : defaultCards;

  // 从卡片数据中提取所有标签
  const getAllTags = () => {
    const tags = cardsToDisplay.flatMap(card => card.tag ? [card.tag] : []);
    return [...new Set(tags)].filter(tag => tag);
  };

  // 获取标签数据格式
  const getTagFilterData = () => {
    const uniqueTags = getAllTags();
    return uniqueTags.map(tag => ({
      title: tag,
      number: tag,
      labels: [{ name: tag }]
    }));
  };

  if (cardsToDisplay.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        暂无卡片数据
      </div>
    );
  }

  return (
    <>
      {cardsToDisplay.map((card, index) => {
        const isExternalLink = card.path?.startsWith('http');

        return (
          <Card className="w-full hover:shadow-md transition-shadow flex flex-col h-full">
            <CardContent className="p-0 flex flex-col">
              {/* 图片部分 */}
              {card.img && (
                <img
                  src={card.img}
                  alt={card.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}

              {/* 内容部分 */}
              <div className="p-4 flex flex-col flex-grow">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-lg font-bold">
                    {isExternalLink ? (
                      <a
                        href={card.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#838EF8] transition-colors"
                      >
                        {card.name}
                      </a>
                    ) : (
                      <Link
                        to={card.path}
                        className="hover:text-[#838EF8] transition-colors"
                      >
                        {card.name}
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>

                {/* 描述 */}
                {card.describe && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 whitespace-pre-line flex-grow">
                    {card.describe}
                  </p>
                )}

                {/* 标签和链接 */}
                <div className="flex items-center justify-between mt-2">
                  {card.tag && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md">
                      {card.tag}
                    </span>
                  )}

                  {isExternalLink ? (
                    <a
                      href={card.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-[#838EF8]"
                    >
                      查看详情
                    </a>
                  ) : (
                    <Link
                      to={card.link}
                      className="text-xs text-gray-500 hover:text-[#838EF8]"
                    >
                      查看详情
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};

export default ImgCardTemp;
