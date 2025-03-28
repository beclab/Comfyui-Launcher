import type { StoryObj } from '@storybook/vue3';
import { data, rssData } from './constant';
import BtMenu from './index.vue';
import { action } from '@storybook/addon-actions';

// More on how to set up stories at: https://storybook.js.org/docs/vue/writing-stories/introduction
const meta = {
  title: 'Components/BtMenu',
  component: BtMenu,
  // This component will have an automatically generated docsPage entry: https://storybook.js.org/docs/vue/writing-docs/autodocs
  tags: ['autodocs'],
  args: {
    items: data,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/vue/api/csf
 * to learn how to use render functions.
 */

export const ItemMuted: Story = {
  args: {
    items: rssData,
  },
  render: (args: any) => ({
    components: { BtMenu },
    setup() {
      return { args };
    },
    methods: { addClick: action('clicked'), selectHandler: action('clicked') },
    template: `
      <bt-menu
        :items="args.items"
        :default-active="1"
        @select="selectHandler"
      >
      </bt-menu>`,
  }),
};

export const ExtraSlot: Story = {
  args: {
    items: data,
  },
  render: (args: any) => ({
    components: { BtMenu },
    setup() {
      return { args };
    },
    methods: { addClick: action('clicked'), selectHandler: action('clicked') },
    template: `
      <bt-menu
        :items="args.items"
        default-active="5-1"
        @select="selectHandler"
      >
        <template #extra-5="scope">
          <q-icon size="xs" name="add" @click="addClick(scope.item)" />
        </template>
        <template #extra-5-2="scope">
          <q-icon size="xs" name="note" @click="addClick(scope.item)" />
        </template>
      </bt-menu>`,
  }),
};
