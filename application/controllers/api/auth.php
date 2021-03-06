<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class Auth extends MY_Controller {

  public function index() {

    $this->load->library('session');
    $this->load->database();
    $this->load->spark('curl/1.2.1');

    // get's POST data and santizes to prevent XSS (NOT DB SANITIZING)
    $code = $this->input->post( 'code', TRUE );
    $type = $this->input->post( 'type', TRUE );

    $response = $this->curl->simple_post('https://www.behance.net/v2/oauth/token', array(
      'client_id'     => BEHANCE_API_KEY,
      'client_secret' => BEHANCE_API_SECRET,
      'redirect_uri'  => BEHANCE_API_REDIRECT . ( !empty( $type ) ? '?type='.$type : '' ),
      'code'          => $code,
      'grant_type'    => 'authorization_code'
    ) );

    // -- FOR DEBUGGING --
    // print_r( $this->curl->info );

    $response = json_decode( $response, true );
    $token    = $response['access_token'];

    $response          = $response['user'];
    $response['token'] = $token;

    // add type if we have it to DB insert
    if ( !empty( $type ) )
      $response['type'] = $type;

    // $response  = $this->_sanitize( $response );
    $user_data = $response;


    $this->session->set_userdata( array(
      'user' => json_encode( $user_data )
    ) );

    // get images and fields
    $images = $response['images'];
    $fields = $response['fields'];
    unset(
      $response['images'],
      $response['fields']
    );

    // insert user
    $this->db->insert( 'users', $response );

    // insert images
    if ( !empty( $images ) ) {

      foreach ( $images as $size => $url ) {

        $this->db->insert( 'users_images', array(
          'user_id' => $user_data['id'],
          'size'    => $size,
          'url'     => $url,
        ) );

      } // foreach images

    } // !empty images

    // insert fields
    if ( !empty( $fields ) ) {

      foreach ( $fields as $field ) {

        $this->db->insert( 'users_fields', array(
          'user_id' => $user_data['id'],
          'field'   => $field,
        ) );

      } // foreach fields

    } // !empty fields

    return $this->_json_output( array(
      'valid'  => 1,
      'status' => 200,
      'user'   => $user_data
    ) );

  } // index

  protected function _sanitize( $data ) {

    if ( empty( $data ) )
      return $data;

    foreach ( $data as $key => $val )
      $data[ $key ] = $this->db->escape( $val );

    return $data;

  } // _sanitize

} // Auth
