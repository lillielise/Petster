// global variables


// handles details click on search page
$('.info-icon').on('click', function(){
  $('.view-details').show();
  $('.info-icon').hide();
  $('.heart-icon-hide').hide();
  $('html, body').animate({ scrollTop: $(document).height() }, 'slow');
});


let count = 0;
$(`.${count}`).show();


// submits the pet details form on heart click
$('.heart-icon').on('click', event => {
  $(`#heart-icon${count}`).toggleClass('image-fade');
  $(`.${count}Form`).submit();
  setTimeout(() => $(`#heart-icon${count} > path`).attr('fill', 'red' ), 0)
})

$('delete-icon-class').on('click', event => {
  $(`.${count}Form`).submit();
})



// credit: https://stackoverflow.com/questions/15685708/determining-if-mouse-click-happened-in-left-or-right-half-of-div

// handles left and right click on img
$(`.flexPet`).click(function(event){
  var x = event.pageX - $(this).offset().left

  if (x > $(this).width()/2) {

    count++
    $('.view-details').hide();
    $('.info-icon').show();
    $(`.${count}`).show();
    $(`.${count-1}`).hide();

  } else {
    if (count !== 0){
      count--
      $('.view-details').hide();
      $('.info-icon').show();
      $(`.${count}`).show();
      $(`.${count+1}`).hide();
    }
  }
});
