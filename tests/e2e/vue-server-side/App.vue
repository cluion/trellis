<script setup lang="ts">
import { ref } from 'vue';
import UserTable from './.generated/UserTable.vue';

const mounted = ref(true);
</script>

<template>
    <main>
        <h1>Vue server-side acceptance</h1>
        <button type="button" @click="mounted = !mounted">
            {{ mounted ? '卸載表格' : '掛載表格' }}
        </button>
        <UserTable v-if="mounted" />
    </main>
</template>
