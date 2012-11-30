<?php  if (! defined('BASEPATH')) exit('No direct script access allowed');

class MY_Controller extends CI_Controller {

  protected function _json_output( $data ) {

    if ( !headers_sent() )
      header( 'Content-Type: application/json; charset=utf-8' );

    echo json_encode( $data );
    exit;

  } // _json_output

} // MY_Loader
