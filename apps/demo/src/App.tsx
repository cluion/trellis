import { useState } from 'react';
import { BasicTable } from './components/BasicTable';
import { SortableTable } from './components/SortableTable';
import { FilterableTable } from './components/FilterableTable';
import { PaginatedTable } from './components/PaginatedTable';
import { FullFeatureTable } from './components/FullFeatureTable';
import { SlotExample } from './components/SlotExample';
import { VirtualScrollTable } from './components/VirtualScrollTable';
import { mockUsers } from './data/mock-data';

const tabs = [
  { id: 'basic', label: '基本表格' },
  { id: 'sort', label: '排序' },
  { id: 'filter', label: '篩選' },
  { id: 'pagination', label: '分頁' },
  { id: 'virtual-scroll', label: '虛擬滾動' },
  { id: 'full', label: '全功能整合' },
  { id: 'slot', label: 'Slot 自定義' },
] as const;

type TabId = typeof tabs[number]['id'];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('full');

  return (
    <div className="app">
      <header className="header">
        <h1>Trellis DataTable Demo</h1>
        <p className="subtitle">Headless、插件驅動的資料表格函式庫</p>
      </header>

      <nav className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'basic' && (
          <section>
            <h2>基本表格渲染</h2>
            <p className="description">
              最基本的表格 — 只使用 @trellisjs/core 和 @trellisjs/react，無插件。
            </p>
            <div className="card">
              <BasicTable data={mockUsers} />
            </div>
          </section>
        )}

        {activeTab === 'sort' && (
          <section>
            <h2>排序功能</h2>
            <p className="description">
              使用 @trellisjs/plugin-sort 插件。點擊表頭切換升序/降序/取消排序。
              支援字串、數字、日期自動偵測。城市欄設定 sortable: false 作為對比。
            </p>
            <div className="card">
              <SortableTable data={mockUsers} />
            </div>
          </section>
        )}

        {activeTab === 'filter' && (
          <section>
            <h2>篩選功能</h2>
            <p className="description">
              使用 @trellisjs/plugin-filter 插件。全域搜尋所有欄位，不分大小寫。
            </p>
            <div className="card">
              <FilterableTable data={mockUsers} />
            </div>
          </section>
        )}

        {activeTab === 'pagination' && (
          <section>
            <h2>分頁功能</h2>
            <p className="description">
              使用 @trellisjs/plugin-pagination 插件。支援上一頁/下一頁/跳頁/每頁筆數變更。
            </p>
            <div className="card">
              <PaginatedTable data={mockUsers} />
            </div>
          </section>
        )}

        {activeTab === 'virtual-scroll' && (
          <section>
            <h2>虛擬滾動</h2>
            <p className="description">
              使用 @trellisjs/plugin-virtual-scroll 插件。10,000 筆資料只渲染可視區域的 DOM 節點，
              保持 60fps 流暢滾動。拖動捲軸觀察渲染範圍變化。
            </p>
            <div className="card">
              <VirtualScrollTable count={10000} />
            </div>
          </section>
        )}

        {activeTab === 'full' && (
          <section>
            <h2>全功能整合</h2>
            <p className="description">
              排序 + 篩選 + 分頁三個插件同時運作，展示真實使用場景。
            </p>
            <div className="card">
              <FullFeatureTable data={mockUsers} />
            </div>
          </section>
        )}

        {activeTab === 'slot' && (
          <section>
            <h2>Slot 自定義渲染</h2>
            <p className="description">
              使用 Slot 系統自定義儲存格渲染。職位欄顯示為彩色徽章，年齡欄顯示為進度條。
              展示 @trellisjs/react 的 SlotRenderer 元件用法。
            </p>
            <div className="card">
              <SlotExample data={mockUsers.slice(0, 10)} />
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Trellis | 11 套件 | 219 測試 | TypeScript</span>
      </footer>
    </div>
  );
}
