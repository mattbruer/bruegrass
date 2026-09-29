<script>
    let { title, onclick,isPlaying } = $props();
</script>

<button class={isPlaying?'underline':''}  {onclick}>{title}</button>