/**
 * Priority Queue (Min-Heap) implementation cho A* algorithm
 * Sử dụng binary heap để đảm bảo O(log n) cho insert và extract min
 */
export class PriorityQueue<T> {
    private heap: T[] = [];
    private compareFn: (a: T, b: T) => number;

    constructor(compareFn: (a: T, b: T) => number) {
        this.compareFn = compareFn;
    }

    /**
     * Thêm phần tử vào heap
     */
    insert(item: T): void {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }

    /**
     * Lấy và xóa phần tử có priority thấp nhất
     */
    extractMin(): T | undefined {
        if (this.heap.length === 0) {
            return undefined;
        }

        if (this.heap.length === 1) {
            return this.heap.pop();
        }

        const min = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.bubbleDown(0);

        return min;
    }

    /**
     * Kiểm tra xem queue có rỗng không
     */
    isEmpty(): boolean {
        return this.heap.length === 0;
    }

    /**
     * Lấy số lượng phần tử
     */
    size(): number {
        return this.heap.length;
    }

    /**
     * Kiểm tra xem item có trong queue không
     */
    has(item: T, equalsFn?: (a: T, b: T) => boolean): boolean {
        if (equalsFn) {
            return this.heap.some((h) => equalsFn(h, item));
        }
        return this.heap.includes(item);
    }

    /**
     * Cập nhật priority của item (nếu item đã tồn tại)
     */
    update(item: T, equalsFn?: (a: T, b: T) => boolean): void {
        const index = equalsFn
            ? this.heap.findIndex((h) => equalsFn(h, item))
            : this.heap.indexOf(item);

        if (index !== -1) {
            this.bubbleUp(index);
            this.bubbleDown(index);
        }
    }

    /**
     * Bubble up: di chuyển phần tử lên trên để duy trì heap property
     */
    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compareFn(this.heap[index], this.heap[parentIndex]) >= 0) {
                break;
            }
            this.swap(index, parentIndex);
            index = parentIndex;
        }
    }

    /**
     * Bubble down: di chuyển phần tử xuống dưới để duy trì heap property
     */
    private bubbleDown(index: number): void {
        while (true) {
            let smallest = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;

            if (
                leftChild < this.heap.length &&
                this.compareFn(this.heap[leftChild], this.heap[smallest]) < 0
            ) {
                smallest = leftChild;
            }

            if (
                rightChild < this.heap.length &&
                this.compareFn(this.heap[rightChild], this.heap[smallest]) < 0
            ) {
                smallest = rightChild;
            }

            if (smallest === index) {
                break;
            }

            this.swap(index, smallest);
            index = smallest;
        }
    }

    /**
     * Hoán đổi hai phần tử
     */
    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
}
