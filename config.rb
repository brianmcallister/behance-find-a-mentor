http_path       = '/'

asset_path = 'assets'

if environment == :production
  css_dir = 'build/assets/css'
else
  css_dir = asset_path + '/css'
end

sass_dir        = asset_path + '/sass'
images_dir      = asset_path + '/images'
javascripts_dir = asset_path + '/js'
fonts_dir       = asset_path + '/fonts'

# You can select your preferred output style here (can be overridden via the command line):
# output_style = :expanded or :nested or :compact or :compressed
output_style = (environment == :production) ? :compressed : :expanded

# To enable relative paths to assets via compass helper functions. Uncomment:
# relative_assets = true
relative_assets = true