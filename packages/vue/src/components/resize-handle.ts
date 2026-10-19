import { defineComponent, h, onBeforeUnmount } from 'vue';
import { useTrellisContext } from '../context';

const HANDLE_STYLE = {
    position: 'absolute',
    right: '0px',
    top: '0px',
    bottom: '0px',
    width: '5px',
    cursor: 'col-resize',
    zIndex: 1,
};

/** 欄寬拖曳把手：按住拖曳時發出 resize:start / resize:column / resize:end。 */
export const TlResizeHandle = defineComponent({
    name: 'TlResizeHandle',
    props: {
        columnId: { type: String, required: true },
    },
    setup(props) {
        const api = useTrellisContext();
        let stopDragging: (() => void) | null = null;

        const onMousedown = (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            // 使用實際 DOM 寬度而非 defaultWidth，避免點擊時跳到錯誤寬度
            const th = (event.target as HTMLElement).closest('th');
            const state = api.getState();
            const startWidth =
                th?.getBoundingClientRect().width ??
                state.columnResizing?.columnWidths[props.columnId] ??
                state.columnResizing?.defaultWidth ??
                150;
            const startX = event.clientX;

            api.emit('resize:start', { columnId: props.columnId });

            const onMousemove = (move: MouseEvent) => {
                api.emit('resize:column', {
                    columnId: props.columnId,
                    width: startWidth + move.clientX - startX,
                });
            };
            const stop = () => {
                document.removeEventListener('mousemove', onMousemove);
                document.removeEventListener('mouseup', onMouseup);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                stopDragging = null;
            };
            const onMouseup = () => {
                api.emit('resize:end');
                stop();
            };

            document.addEventListener('mousemove', onMousemove);
            document.addEventListener('mouseup', onMouseup);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            stopDragging = stop;
        };

        // 拖曳中途卸載時，移除掛在 document 上的監聽器
        onBeforeUnmount(() => stopDragging?.());

        return () =>
            h('div', {
                class: 'trellis-resize-handle',
                style: HANDLE_STYLE,
                onMousedown,
            });
    },
});
