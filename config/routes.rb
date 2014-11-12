Rails.application.routes.draw do
  # The priority is based upon order of creation: first created -> highest priority.
  # See how all your routes lay out with "rake routes".

  # You can have the root of your site routed with "root"
  root 'application#index'
  post '/uploadCSV' => 'application#upload_csv'
  post '/getResults' => 'application#get_results'

  get '/help' => 'application#help'
  get '/examples' => 'application#examples'

end
